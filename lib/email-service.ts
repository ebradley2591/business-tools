export interface InviteEmailData {
  email: string;
  role: string;
  tenantName: string;
  invitedBy: string;
  inviteUrl: string;
}

// Simple fallback function that logs invitation details
export async function sendInviteEmailFallback(data: InviteEmailData) {
  console.log('📧 Invitation Details (Copy URL to test):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`To: ${data.email}`);
  console.log(`Role: ${data.role}`);
  console.log(`Organization: ${data.tenantName}`);
  console.log(`Invited by: ${data.invitedBy}`);
  console.log(`Invitation URL: ${data.inviteUrl}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 To test: Copy the URL above and paste it in your browser');
  console.log('💡 For production: Set up email service or use manual link sharing');
  
  return { success: true, messageId: 'fallback' };
}
