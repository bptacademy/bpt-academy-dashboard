// Re-export from shared context so all consumers share the same state.
// The old standalone hook caused badge / mark-all-read desync across components.
export { useNotifications } from '../context/NotificationsContext';
