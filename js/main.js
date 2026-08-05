// 移动端导航栏切换
document.addEventListener('DOMContentLoaded', function () {
    var navToggle = document.querySelector('.nav-toggle');
    var navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', function () {
            navToggle.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // 点击菜单项后关闭移动端菜单
        var navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(function (link) {
            link.addEventListener('click', function () {
                navToggle.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // 简易访问计数（localStorage）
    var visitEl = document.getElementById('visit-count');
    if (visitEl) {
        var visits = localStorage.getItem('visit-count');
        visits = visits ? parseInt(visits, 10) + 1 : 1;
        localStorage.setItem('visit-count', visits);
        visitEl.textContent = visits;
    }
});
