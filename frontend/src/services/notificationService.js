// Notification Service for Dementia Tracker
import toast from 'react-hot-toast';

class NotificationService {
  constructor() {
    this.subscribers = new Set();
  }

  // Subscribe to notifications
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // Notify all subscribers
  notify(type, message, data = {}) {
    this.subscribers.forEach(callback => {
      try {
        callback(type, message, data);
      } catch (error) {
        console.error('Notification callback error:', error);
      }
    });
  }

  // Test completion notification
  notifyTestCompletion(testResult) {
    const { test_type, percentage, performance_feedback } = testResult;
    
    // Show success toast
    toast.success(`🎉 ${test_type.replace('_', ' ')} test completed! Score: ${percentage}%`, {
      duration: 5000,
      position: 'top-right',
    });

    // Notify subscribers for dashboard refresh
    this.notify('TEST_COMPLETED', 'Test completed successfully', { testResult });
  }

  // Test result saved notification
  notifyTestSaved(testResult) {
    try {
      const { test_type, percentage } = testResult || {};
      const testTypeDisplay = test_type ? test_type.replace('_', ' ') : 'cognitive';
      const scoreDisplay = percentage !== undefined ? `${percentage}%` : 'completed';
      
      toast.success(`✅ Test results saved! Your ${testTypeDisplay} test: ${scoreDisplay}`, {
        duration: 4000,
        position: 'top-right',
      });

      // Trigger dashboard refresh notification
      this.notify('DASHBOARD_REFRESH', 'Dashboard updated with new results', { testResult });
    } catch (error) {
      console.error('Error in notifyTestSaved:', error);
      toast.success('✅ Test results saved successfully!', {
        duration: 4000,
        position: 'top-right',
      });
    }
  }

  // Error notification
  notifyError(message, error = null) {
    console.error('Notification error:', error);
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
    });
  }

  // Success notification
  notifySuccess(message) {
    toast.success(message, {
      duration: 4000,
      position: 'top-right',
    });
  }

  // Warning notification
  notifyWarning(message) {
    toast(message, {
      icon: '⚠️',
      duration: 4000,
      position: 'top-right',
    });
  }

  // Info notification
  notifyInfo(message) {
    toast(message, {
      icon: 'ℹ️',
      duration: 3000,
      position: 'top-right',
    });
  }

  // Dashboard refresh notification
  notifyDashboardRefresh() {
    this.notify('DASHBOARD_REFRESH', 'Dashboard data refreshed');
  }

  // Test scheduled notification
  notifyTestScheduled(testType, scheduledDate) {
    toast.success(`📅 ${testType.replace('_', ' ')} test scheduled for ${new Date(scheduledDate).toLocaleDateString()}`, {
      duration: 5000,
      position: 'top-right',
    });
  }

  // Risk assessment notification
  notifyRiskAssessment(riskLevel, score) {
    const emoji = riskLevel === 'High' ? '⚠️' : riskLevel === 'Moderate' ? '⚡' : '✅';
    toast(`${emoji} Risk assessment completed: ${riskLevel} risk (${score}/100)`, {
      duration: 6000,
      position: 'top-right',
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
