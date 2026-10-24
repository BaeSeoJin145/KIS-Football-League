// ============================================
// KFL Notifications (In-App)
// ============================================
// Handles in-app notification toasts for realtime events.
// Browser Push notification requires a server and is 
// documented as a limitation.

/**
 * Handle a realtime match event and show appropriate notification
 */
function handleRealtimeNotification(type, payload) {
  if (!payload || !payload.new) return;

  const data = payload.new;
  const eventType = payload.eventType; // INSERT, UPDATE, DELETE

  if (type === 'match') {
    handleMatchNotification(data, eventType, payload.old);
  } else if (type === 'event') {
    handleEventNotification(data, eventType);
  }
}

/**
 * Handle match status/score changes
 */
function handleMatchNotification(match, eventType, oldMatch) {
  if (eventType !== 'UPDATE' || !oldMatch) return;

  // Status changed to live
  if (oldMatch.status !== 'live' && match.status === 'live') {
    showToast({
      title: '경기 시작',
      message: `경기가 시작되었습니다.`,
      type: 'info',
      duration: 6000
    });
  }

  // Halftime
  if (oldMatch.status !== 'halftime' && match.status === 'halftime') {
    showToast({
      title: '하프타임',
      message: `전반전이 종료되었습니다.`,
      type: 'info',
      duration: 5000
    });
  }

  // Match finished
  if (oldMatch.status !== 'finished' && match.status === 'finished') {
    showToast({
      title: '경기 종료',
      message: `최종 스코어: ${match.home_score} - ${match.away_score}`,
      type: 'info',
      duration: 8000
    });
  }

  // Score changed (goal!)
  if (match.status === 'live' || match.status === 'halftime') {
    const homeScoreChanged = oldMatch.home_score !== match.home_score;
    const awayScoreChanged = oldMatch.away_score !== match.away_score;
    
    if (homeScoreChanged || awayScoreChanged) {
      showToast({
        title: '골',
        message: `${match.home_score} - ${match.away_score}`,
        type: 'goal',
        duration: 6000
      });
    }
  }
}

/**
 * Handle match event (goal, card, etc.) notifications
 */
function handleEventNotification(event, eventType) {
  if (eventType !== 'INSERT') return;
  
  const labels = KFL_CONFIG.EVENT_TYPE_LABELS;
  const label = labels[event.type];
  
  if (!label) return;

  // Only notify for significant events
  const notifyTypes = ['goal', 'own_goal', 'red_card'];
  if (!notifyTypes.includes(event.type)) return;

  const toastType = event.type === 'goal' || event.type === 'own_goal' ? 'goal' : 'warning';

  showToast({
    title: label,
    message: event.minute ? `${event.minute}분` : '',
    type: toastType,
    duration: 5000
  });
}

/**
 * Request browser notification permission (for future use)
 */
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.log('[Notifications] Browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Show a browser notification (only if app is in background)
 */
function showBrowserNotification(title, body, icon = '/assets/icons/icon-192.png') {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return; // Don't show if app is visible

  try {
    const notification = new Notification(title, {
      body,
      icon,
      badge: icon,
      tag: 'kfl-notification',
      renotify: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.warn('[Notifications] Failed to show browser notification:', e);
  }
}
