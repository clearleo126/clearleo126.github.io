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

    // 目录高亮（滚动监听）
    var tocList = document.getElementById('toc-list');
    var articleContent = document.getElementById('article-content');

    if (tocList && articleContent) {
        var headings = articleContent.querySelectorAll('h2[id], h3[id], h4[id]');
        var tocLinks = tocList.querySelectorAll('a');

        function highlightToc() {
            var scrollPos = window.scrollY + 100;
            var current = null;

            headings.forEach(function (heading) {
                if (heading.offsetTop <= scrollPos) {
                    current = heading.getAttribute('id');
                }
            });

            tocLinks.forEach(function (link) {
                link.classList.remove('active');
                var href = link.getAttribute('href');
                if (href && href.substring(1) === current) {
                    link.classList.add('active');
                }
            });
        }

        window.addEventListener('scroll', highlightToc);
        highlightToc();
    }
});
