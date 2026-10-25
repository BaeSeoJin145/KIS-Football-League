// ============================================
// KFL Realtime Subscriptions
// ============================================
// Subscribe to Supabase Realtime for live score updates.

let _channels = [];

/**
 * Subscribe to match updates (score changes, status changes)
 */
function subscribeToMatches(onUpdate) {
  const sb = getSupabase();
  if (sb) {
    try {
      const channel = sb.channel('matches-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'matches' },
          (payload) => {
            console.log('[Realtime] Match update:', payload);
            if (onUpdate) onUpdate('match', payload);

            if (payload.new) {
              updateMatchScoreUI(payload.new);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Matches subscription:', status);
        });

      _channels.push(channel);
      return channel;
    } catch (err) {
      console.warn('[Realtime] Failed to subscribe to matches:', err);
    }
  }

  // Local demo fallback event listener
  const localHandler = (e) => {
    if (e.detail) {
      if (onUpdate) onUpdate('match', { new: e.detail });
      updateMatchScoreUI(e.detail);
    }
  };
  window.addEventListener('kfl:match_update', localHandler);
  return { unsubscribe: () => window.removeEventListener('kfl:match_update', localHandler) };
}

/**
 * Subscribe to match events (goals, cards, etc.)
 */
function subscribeToMatchEvents(onUpdate) {
  const sb = getSupabase();
  if (sb) {
    try {
      const channel = sb.channel('events-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'match_events' },
          (payload) => {
            console.log('[Realtime] Event update:', payload);
            if (onUpdate) onUpdate('event', payload);
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Events subscription:', status);
        });

      _channels.push(channel);
      return channel;
    } catch (err) {
      console.warn('[Realtime] Failed to subscribe to events:', err);
    }
  }

  const localHandler = (e) => {
    if (e.detail && onUpdate) onUpdate('event', { new: e.detail });
  };
  window.addEventListener('kfl:event_update', localHandler);
  return { unsubscribe: () => window.removeEventListener('kfl:event_update', localHandler) };
}

/**
 * Subscribe to a specific match (for match detail page)
 */
function subscribeToMatch(matchId, onUpdate) {
  const sb = getSupabase();
  if (sb) {
    try {
      const channel = sb.channel(`match-${matchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `id=eq.${matchId}`
          },
          (payload) => {
            console.log('[Realtime] Match detail update:', payload);
            if (onUpdate) onUpdate('match', payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_events',
            filter: `match_id=eq.${matchId}`
          },
          (payload) => {
            console.log('[Realtime] Match event update:', payload);
            if (onUpdate) onUpdate('event', payload);
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] Match ${matchId} subscription:`, status);
        });

      _channels.push(channel);
      return channel;
    } catch (err) {
      console.warn(`[Realtime] Failed to subscribe to match ${matchId}:`, err);
    }
  }

  const localMatchHandler = (e) => {
    if (e.detail && e.detail.id === matchId && onUpdate) {
      onUpdate('match', { new: e.detail });
    }
  };
  const localEventHandler = (e) => {
    if (e.detail && e.detail.match_id === matchId && onUpdate) {
      onUpdate('event', { new: e.detail });
    }
  };
  window.addEventListener('kfl:match_update', localMatchHandler);
  window.addEventListener('kfl:event_update', localEventHandler);
  return {
    unsubscribe: () => {
      window.removeEventListener('kfl:match_update', localMatchHandler);
      window.removeEventListener('kfl:event_update', localEventHandler);
    }
  };
}

/**
 * Update match score in the DOM
 */
function updateMatchScoreUI(matchData) {
  const homeEl = document.getElementById(`score-home-${matchData.id}`);
  const awayEl = document.getElementById(`score-away-${matchData.id}`);
  
  if (homeEl && homeEl.textContent !== String(matchData.home_score)) {
    homeEl.textContent = matchData.home_score;
    homeEl.classList.add('animate-score-update');
    setTimeout(() => homeEl.classList.remove('animate-score-update'), 700);
  }
  
  if (awayEl && awayEl.textContent !== String(matchData.away_score)) {
    awayEl.textContent = matchData.away_score;
    awayEl.classList.add('animate-score-update');
    setTimeout(() => awayEl.classList.remove('animate-score-update'), 700);
  }
  
  // Flash the match card
  const card = document.getElementById(`match-card-${matchData.id}`);
  if (card) {
    card.classList.add('animate-goal-flash');
    setTimeout(() => card.classList.remove('animate-goal-flash'), 2000);
  }
}

/**
 * Unsubscribe from all channels
 */
function unsubscribeAll() {
  const sb = getSupabase();
  if (!sb) {
    _channels = [];
    return;
  }
  _channels.forEach(channel => {
    try {
      sb.removeChannel(channel);
    } catch (err) {
      console.warn('[Realtime] Failed to remove channel:', err);
    }
  });
  _channels = [];
}

/**
 * Handle network reconnection
 */
function setupReconnection(refreshCallback) {
  window.addEventListener('online', () => {
    console.log('[Network] Back online, refreshing data...');
    showToast({ title: '네트워크 복구', message: '최신 데이터를 불러옵니다.', type: 'info' });
    if (refreshCallback) refreshCallback();
  });

  window.addEventListener('offline', () => {
    console.log('[Network] Offline');
    showToast({ title: '오프라인', message: '네트워크 연결을 확인해주세요.', type: 'warning' });
  });
}
