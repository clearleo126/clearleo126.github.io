// cusparse_pure_eval.cu
// 纯 cuSPARSE SpMM 评测（FP32, CSR），输出 kernel 时间、端到端时间、GFLOPS
// 用法: ./cusparse_pure_eval <mtx路径> <N> [iter=50]
// 输出一行: m,k,nnz,kernel_ms,e2e_ms,gflops
//   kernel_ms: 仅 cusparseSpMM kernel 平均耗时（iter 次）
//   e2e_ms   : 含 H2D(A/B) + cusparseSpMM + D2H(C) 的端到端平均耗时（5 次）
//   gflops   : 2*nnz*N / (kernel_ms * 1e6)
#include <cstdio>
#include <cstdlib>
#include <vector>
#include <string>
#include <cuda_runtime.h>
#include <cusparse.h>
#include <fstream>
#include "util/util.hpp"

#define CHECK_CUSPARSE(call)                                                       \
    do {                                                                           \
        cusparseStatus_t st_ = (call);                                             \
        if (st_ != CUSPARSE_STATUS_SUCCESS) {                                      \
            fprintf(stderr, "CUSPARSE error %d at %s:%d\n", st_, __FILE__, __LINE__); \
            exit(1);                                                               \
        }                                                                          \
    } while (0)

#define CHECK_CUDA(call)                                                           \
    do {                                                                           \
        cudaError_t e_ = (call);                                                   \
        if (e_ != cudaSuccess) {                                                   \
            fprintf(stderr, "CUDA error %s at %s:%d\n", cudaGetErrorString(e_),    \
                    __FILE__, __LINE__);                                           \
            exit(1);                                                               \
        }                                                                          \
    } while (0)

int main(int argc, char** argv) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <mtx_path> <N> [iter=50]\n", argv[0]);
        return 1;
    }
    const char* mtx_path = argv[1];
    int n = atoi(argv[2]);
    int iter = (argc >= 4) ? atoi(argv[3]) : 50;

    std::vector<int> row_indices, col_indices;
    std::vector<float> values;
    int m, k, nnz;
    readMtx<float>(mtx_path, row_indices, col_indices, values, m, k, nnz);

    // COO -> CSR
    std::vector<int> A_indptr(m + 1, 0);
    for (int i = 0; i < nnz; i++) A_indptr[row_indices[i] + 1]++;
    for (int i = 1; i <= m; i++) A_indptr[i] += A_indptr[i - 1];
    std::vector<int> A_indices(nnz);
    std::vector<float> A_data(nnz, 1.0f);
    std::vector<int> cursor(A_indptr.begin(), A_indptr.end() - 1);
    for (int i = 0; i < nnz; i++) {
        int r = row_indices[i];
        int ptr = cursor[r]++;
        A_indices[ptr] = col_indices[i];
    }

    // 随机初始化 B (k x n, row-major)
    std::vector<float> hB((size_t)k * n);
    for (size_t i = 0; i < hB.size(); i++) hB[i] = (rand() % 100 - 50) / 100.0f;
    std::vector<float> hC((size_t)m * n, 0.0f);

    int *d_indptr = nullptr, *d_indices = nullptr;
    float *d_data = nullptr, *d_B = nullptr, *d_C = nullptr;
    CHECK_CUDA(cudaMalloc(&d_indptr, (m + 1) * sizeof(int)));
    CHECK_CUDA(cudaMalloc(&d_indices, nnz * sizeof(int)));
    CHECK_CUDA(cudaMalloc(&d_data, nnz * sizeof(float)));
    CHECK_CUDA(cudaMalloc(&d_B, hB.size() * sizeof(float)));
    CHECK_CUDA(cudaMalloc(&d_C, hC.size() * sizeof(float)));

    cusparseHandle_t handle = nullptr;
    cusparseSpMatDescr_t matA = nullptr;
    cusparseDnMatDescr_t matB = nullptr, matC = nullptr;
    CHECK_CUSPARSE(cusparseCreate(&handle));
    CHECK_CUSPARSE(cusparseCreateCsr(&matA, m, k, nnz, d_indptr, d_indices, d_data,
                                     CUSPARSE_INDEX_32I, CUSPARSE_INDEX_32I,
                                     CUSPARSE_INDEX_BASE_ZERO, CUDA_R_32F));
    CHECK_CUSPARSE(cusparseCreateDnMat(&matB, k, n, n, d_B, CUDA_R_32F, CUSPARSE_ORDER_ROW));
    CHECK_CUSPARSE(cusparseCreateDnMat(&matC, m, n, n, d_C, CUDA_R_32F, CUSPARSE_ORDER_ROW));

    float alpha = 1.0f, beta = 0.0f;
    cusparseSpMMAlg_t algos[4] = {CUSPARSE_SPMM_ALG_DEFAULT, CUSPARSE_SPMM_CSR_ALG1,
                                  CUSPARSE_SPMM_CSR_ALG2, CUSPARSE_SPMM_CSR_ALG3};
    void* dBuffer = nullptr;
    // 选 buffer 最大的算法（其余算法会自动复用，不足时重新分配）
    size_t maxBuffer = 0;
    for (int a = 0; a < 4; a++) {
        size_t bs = 0;
        if (cusparseSpMM_bufferSize(handle, CUSPARSE_OPERATION_NON_TRANSPOSE,
                                    CUSPARSE_OPERATION_NON_TRANSPOSE,
                                    &alpha, matA, matB, &beta, matC, CUDA_R_32F,
                                    algos[a], &bs) != CUSPARSE_STATUS_SUCCESS) {
            algos[a] = (cusparseSpMMAlg_t)-1; // 标记不可用
            continue;
        }
        if (bs > maxBuffer) maxBuffer = bs;
    }
    CHECK_CUDA(cudaMalloc(&dBuffer, maxBuffer ? maxBuffer : 1024));

    // 准备阶段（一次性拷贝，不算在 kernel 计时内）
    CHECK_CUDA(cudaMemcpy(d_indptr, A_indptr.data(), (m + 1) * sizeof(int), cudaMemcpyHostToDevice));
    CHECK_CUDA(cudaMemcpy(d_indices, A_indices.data(), nnz * sizeof(int), cudaMemcpyHostToDevice));
    CHECK_CUDA(cudaMemcpy(d_data, A_data.data(), nnz * sizeof(float), cudaMemcpyHostToDevice));
    CHECK_CUDA(cudaMemcpy(d_B, hB.data(), hB.size() * sizeof(float), cudaMemcpyHostToDevice));

    cudaEvent_t start, stop;
    cudaEventCreate(&start);
    cudaEventCreate(&stop);

    // 对每个可用算法 warmup + 测 kernel 时间，取最快
    cusparseSpMMAlg_t bestAlgo = algos[0];
    float bestKernelMs = 1e30f;
    for (int a = 0; a < 4; a++) {
        if ((int)algos[a] == -1) continue;
        for (int i = 0; i < 10; i++) {
            cusparseSpMM(handle, CUSPARSE_OPERATION_NON_TRANSPOSE, CUSPARSE_OPERATION_NON_TRANSPOSE,
                         &alpha, matA, matB, &beta, matC, CUDA_R_32F, algos[a], dBuffer);
        }
        cudaDeviceSynchronize();
        cudaEventRecord(start);
        for (int i = 0; i < iter; i++) {
            cusparseSpMM(handle, CUSPARSE_OPERATION_NON_TRANSPOSE, CUSPARSE_OPERATION_NON_TRANSPOSE,
                         &alpha, matA, matB, &beta, matC, CUDA_R_32F, algos[a], dBuffer);
        }
        cudaEventRecord(stop);
        cudaEventSynchronize(stop);
        float ms = 0;
        cudaEventElapsedTime(&ms, start, stop);
        ms /= iter;
        if (ms < bestKernelMs) {
            bestKernelMs = ms;
            bestAlgo = algos[a];
        }
    }
    float kernel_ms = bestKernelMs;

    // 端到端时间（5 次平均：H2D + kernel + D2H）
    int e2e_iter = 5;
    float e2e_ms = 0;
    cudaEventRecord(start);
    for (int i = 0; i < e2e_iter; i++) {
        cudaMemcpy(d_indptr, A_indptr.data(), (m + 1) * sizeof(int), cudaMemcpyHostToDevice);
        cudaMemcpy(d_indices, A_indices.data(), nnz * sizeof(int), cudaMemcpyHostToDevice);
        cudaMemcpy(d_data, A_data.data(), nnz * sizeof(float), cudaMemcpyHostToDevice);
        cudaMemcpy(d_B, hB.data(), hB.size() * sizeof(float), cudaMemcpyHostToDevice);
        cusparseSpMM(handle, CUSPARSE_OPERATION_NON_TRANSPOSE, CUSPARSE_OPERATION_NON_TRANSPOSE,
                     &alpha, matA, matB, &beta, matC, CUDA_R_32F, bestAlgo, dBuffer);
        cudaMemcpy(hC.data(), d_C, hC.size() * sizeof(float), cudaMemcpyDeviceToHost);
    }
    cudaEventRecord(stop);
    cudaEventSynchronize(stop);
    cudaEventElapsedTime(&e2e_ms, start, stop);
    e2e_ms /= e2e_iter;

    double gflops = (2.0 * nnz * n) / (kernel_ms * 1e6);

    printf("%d,%d,%d,%.5f,%.5f,%.3f\n", m, k, nnz, kernel_ms, e2e_ms, gflops);

    cusparseDestroySpMat(matA);
    cusparseDestroyDnMat(matB);
    cusparseDestroyDnMat(matC);
    cusparseDestroy(handle);
    cudaFree(dBuffer);
    cudaFree(d_indptr);
    cudaFree(d_indices);
    cudaFree(d_data);
    cudaFree(d_B);
    cudaFree(d_C);
    return 0;
}
