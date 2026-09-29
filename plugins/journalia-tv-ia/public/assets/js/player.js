/**
 * Journal TV IA — VIDEO-PLAYER-001
 * UI légère autour du lecteur HTML5 natif.
 * Un clic explicite démarre la vidéo avec le son.
 * Les contrôles HTML5 restent le fallback permanent.
 */
(function () {
	'use strict';

	function initPlayer(wrapper) {
		var video = wrapper.querySelector('video');
		var start = wrapper.querySelector('[data-jt-video-start]');

		if (!video || !start) {
			return;
		}

		start.addEventListener('click', function () {
			// Le clic utilisateur autorise normalement la lecture avec son.
			video.muted = false;
			video.volume = 1;

			var playResult;
			try {
				playResult = video.play();
			} catch (error) {
				wrapper.classList.remove('is-playing');
				return;
			}

			if (playResult && typeof playResult.then === 'function') {
				playResult.then(function () {
					wrapper.classList.add('is-playing');
				}).catch(function () {
					// Aucun masquage du player natif en cas d'échec.
					wrapper.classList.remove('is-playing');
				});
			} else {
				wrapper.classList.add('is-playing');
			}
		});

		video.addEventListener('play', function () {
			wrapper.classList.add('is-playing');
		});

		video.addEventListener('ended', function () {
			wrapper.classList.remove('is-playing');
		});
	}

	function init() {
		document.querySelectorAll('[data-jt-video-player]').forEach(initPlayer);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
