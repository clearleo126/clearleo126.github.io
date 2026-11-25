(function () {
  var cursor = document.getElementById('d1');
  if (!cursor) return;

  cursor.style.top = '-100px';
  cursor.style.left = '-100px';

  document.addEventListener('mousemove', function (e) {
    cursor.style.top = e.clientY + 'px';
    cursor.style.left = e.clientX + 'px';

    var target = e.target;
    var mode = target && target.dataset ? target.dataset.mouse : null;

    if (mode === 'big') {
      var img = target.dataset.img || '';
      cursor.style.background = 'var(--red-1) url(' + img + ') no-repeat center';
      cursor.style.backgroundSize = (target.width || 50) + 'px ' + (target.height || 50) + 'px';
      cursor.className = 'reimu-cursor reimu-cursor-big';
      cursor.style.animationName = 'reimu-cursor-grow';
      cursor.style.animationDuration = '0.3s';
      cursor.style.backgroundPositionX = -e.offsetX + 'px';
      cursor.style.backgroundPositionY = -e.offsetY + 'px';
    } else if (mode === 'small') {
      cursor.style.background = '';
      cursor.className = 'reimu-cursor reimu-cursor-small';
      cursor.style.animationName = 'reimu-cursor-shrink';
      cursor.style.animationDuration = '0.3s';
    } else if (mode === 'mid') {
      cursor.style.background = '';
      cursor.className = 'reimu-cursor reimu-cursor-mid';
      cursor.style.animationName = '';
      cursor.style.animationDuration = '';
    } else {
      cursor.style.background = '';
      cursor.style.animationName = '';
      cursor.style.animationDuration = '';
      var clickable =
        target.closest &&
        target.closest(
          'a, button, summary, input, select, textarea, label, [role="button"], [role="link"], [role="tab"], [onclick], .btn, .aplayer-play, .aplayer-pic, .aplayer-bar-wrap, .aplayer-volume-wrap, .aplayer-list-item'
        );
      cursor.className = clickable
        ? 'reimu-cursor reimu-cursor-link'
        : 'reimu-cursor';
    }
  });

  document.addEventListener('mousedown', function () {
    cursor.style.animationName = 'reimu-cursor-pulse';
    cursor.style.animationDuration = '0.2s';
  });

  document.addEventListener('mouseup', function () {
    cursor.style.animationName = '';
    cursor.style.animationDuration = '';
  });
})();
