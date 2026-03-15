package com.wordweft.notification.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
public class EmailService {

    @Value("${wordweft.email.apps-script-url}")
    private String appsScriptUrl;

    @Value("${wordweft.app.frontendUrl}")
    private String frontendUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void sendWelcomeEmail(String toEmail, String username) {
        String subject = "Welcome to WordWeft! 🎉";
        String html = """
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to WordWeft</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">Your story begins here ✨</p>
                </div>
                <div style="padding: 32px;">
                    <p style="font-size: 16px; color: #374151; line-height: 1.6;">
                        Hi <strong>%s</strong>,
                    </p>
                    <p style="font-size: 15px; color: #4b5563; line-height: 1.7;">
                        We're thrilled to have you join the WordWeft community! Whether you're here to read captivating stories or share your own, you've found the right place.
                    </p>
                    <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #f3f4f6;">
                        <p style="font-size: 14px; color: #6b7280; margin: 0 0 12px; font-weight: 600;">Here's what you can do:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 2;">
                            <li>📖 Discover and read amazing stories</li>
                            <li>✍️ Write and publish your own books</li>
                            <li>💬 Connect with readers and authors</li>
                            <li>📚 Build your personal library</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="%s" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                            Start Exploring →
                        </a>
                    </div>
                    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                        Happy reading! 📚<br/>
                        — The WordWeft Team
                    </p>
                </div>
            </div>
            """.formatted(username, frontendUrl);

        sendHtmlEmail(toEmail, subject, html);
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        String subject = "Reset Your WordWeft Password";
        String resetLink = frontendUrl + "/#/reset-password?token=" + resetToken;
        String html = """
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Password Reset</h1>
                    <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 16px;">We've got you covered!</p>
                </div>
                <div style="padding: 32px;">
                    <p style="font-size: 15px; color: #4b5563; line-height: 1.7;">
                        We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>1 hour</strong>.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="%s" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="font-size: 13px; color: #6b7280; line-height: 1.6;">
                        If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                    <div style="background: #fef3c7; border-radius: 8px; padding: 12px 16px; margin: 20px 0; border: 1px solid #fde68a;">
                        <p style="font-size: 12px; color: #92400e; margin: 0;">
                            ⚠️ <strong>Security tip:</strong> Never share this link with anyone. WordWeft will never ask for your password via email.
                        </p>
                    </div>
                    <p style="font-size: 13px; color: #9ca3af; text-align: center; margin-top: 32px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                        — The WordWeft Team
                    </p>
                </div>
            </div>
            """.formatted(resetLink);

        sendHtmlEmail(toEmail, subject, html);
    }

    private void sendHtmlEmail(String toEmail, String subject, String htmlContent) {
        if (appsScriptUrl == null || appsScriptUrl.isBlank()) {
            System.err.println("❌ Apps Script URL not configured! Set GMAIL_APPS_SCRIPT_URL in environment. Email to " + toEmail + " was NOT sent.");
            return;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> payload = new HashMap<>();
            payload.put("to", toEmail);
            payload.put("subject", subject);
            payload.put("htmlBody", htmlContent);
            payload.put("senderName", "WordWeft");

            HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);
            
            ResponseEntity<String> response = restTemplate.postForEntity(appsScriptUrl, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null && response.getBody().contains("\"success\":true")) {
                System.out.println("✅ Email sent successfully to: " + toEmail);
            } else {
                System.err.println("❌ Failed to send email to " + toEmail + " — Apps Script responded: " + response.getBody());
            }

        } catch (Exception e) {
            System.err.println("❌ Failed to send email to " + toEmail + " via Apps Script: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
