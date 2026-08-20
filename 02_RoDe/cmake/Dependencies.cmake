include(cmake/Cuda.cmake)

# TODO(tgale): Move cuSPARSE, cuBLAS deps to test & benchmark only.
# cuda_find_library(CUDART_LIBRARY cudart_static)
# cuda_find_library(CUBLAS_LIBRARY cublas_static)
# cuda_find_library(CUSPARSE_LIBRARY cusparse_static)
# list(APPEND SPC_LIBS "cudart_static;cublas_static;cusparse_static;culibos;cublasLt_static")

# Google Glog.
# find_package(Glog REQUIRED)
# list(APPEND SPC_LIBS ${GLOG_LIBRARIES})

set(CMAKE_PREFIX_PATH "$ENV{CONDA_PREFIX}" ${CMAKE_PREFIX_PATH})

# Google Glog
find_package(Glog REQUIRED)
include_directories(${GLOG_INCLUDE_DIRS})
list(APPEND SPC_LIBS ${GLOG_LIBRARIES})

# 添加宏定义
add_definitions(-DGLOG_NO_ABBREVIATED_SEVERITIES)

# add_subdirectory(third_party/abseil-cpp)
find_package(absl REQUIRED)
list(APPEND SPC_LIBS "absl::random_random")


