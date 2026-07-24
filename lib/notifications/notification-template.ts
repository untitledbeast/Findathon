export interface NotificationTemplatePayload {
  title: string;
  body: string;
}

export const NotificationTemplate = {
  renderSubmissionReceived(title: string): NotificationTemplatePayload {
    return {
      title: 'Submission Received! 🎉',
      body: `Your hackathon submission "${title}" has been received and is currently under review.`
    };
  },

  renderApproved(title: string): NotificationTemplatePayload {
    return {
      title: 'Hackathon Approved! 🚀',
      body: `Great news! "${title}" has been approved and is now live on Findathon.`
    };
  },

  renderDeadlineReminder(title: string, deadlineDate: string): NotificationTemplatePayload {
    return {
      title: 'Registration Deadline Approaching! ⏰',
      body: `Registration for "${title}" closes soon on ${deadlineDate}. Don't miss out!`
    };
  }
};
