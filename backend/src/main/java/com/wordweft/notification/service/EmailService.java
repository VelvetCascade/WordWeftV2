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
        String subject = "Welcome to WordWeft!";
        String html = """
            <div style="font-family: 'Literata', 'Segoe UI', serif; max-width: 600px; margin: 0 auto; background: #FBF9F6; border-radius: 16px; overflow: hidden; border: 1px solid #D7CCC8;">
                <div style="background: #3E2723; padding: 40px 32px; text-align: center;">
                    <h1 style="color: #FFFFFF; margin: 0; font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700;">Welcome to WordWeft</h1>
                    <p style="color: #D7CCC8; margin: 8px 0 0; font-family: 'Inter', sans-serif; font-size: 16px;">Your story begins here ✨</p>
                </div>
                <div style="padding: 32px; background: #FFFFFF;">
                    <p style="font-size: 16px; color: #4E342E; line-height: 1.6;">
                        Hi <strong>%s</strong>,
                    </p>
                    <p style="font-size: 15px; color: #5D4037; line-height: 1.7;">
                        We're thrilled to have you join the WordWeft community! Whether you're here to read captivating stories or share your own, you've found the right place.
                    </p>
                    <div style="background: #FBF9F6; border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #EFEBE9;">
                        <p style="font-size: 14px; color: #8D6E63; margin: 0 0 12px; font-weight: 600;">Here's what you can do:</p>
                        <ul style="margin: 0; padding-left: 20px; color: #5D4037; font-size: 14px; line-height: 2;">
                            <li>Discover and read amazing stories</li>
                            <li>Write and publish your own books</li>
                            <li>Connect with readers and authors</li>
                            <li>Build your personal library</li>
                        </ul>
                    </div>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="%s" style="background: #8D6E63; color: #ffffff; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-family: 'Inter', sans-serif; font-size: 15px; display: inline-block;">
                            Start Exploring →
                        </a>
                    </div>
                    <p style="font-size: 13px; color: #A1887F; text-align: center; margin-top: 32px; border-top: 1px solid #EFEBE9; padding-top: 20px;">
                        Happy reading!<br/>
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
            <div style="font-family: 'Literata', 'Segoe UI', serif; max-width: 600px; margin: 0 auto; background: #FBF9F6; border-radius: 16px; overflow: hidden; border: 1px solid #D7CCC8;">
                <div style="background: #3E2723; padding: 40px 32px; text-align: center;">
                    <h1 style="color: #FFFFFF; margin: 0; font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700;">Password Reset</h1>
                    <p style="color: #D7CCC8; margin: 8px 0 0; font-family: 'Inter', sans-serif; font-size: 16px;">We've got you covered!</p>
                </div>
                <div style="padding: 32px; background: #FFFFFF;">
                    <p style="font-size: 15px; color: #5D4037; line-height: 1.7;">
                        We received a request to reset your password. Click the button below to create a new password. This link will expire in <strong>1 hour</strong>.
                    </p>
                    <div style="text-align: center; margin: 32px 0;">
                        <a href="%s" style="background: #8D6E63; color: #ffffff; padding: 14px 36px; border-radius: 12px; text-decoration: none; font-weight: 600; font-family: 'Inter', sans-serif; font-size: 15px; display: inline-block;">
                            Reset Password
                        </a>
                    </div>
                    <p style="font-size: 13px; color: #8D6E63; line-height: 1.6;">
                        If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                    </p>
                    <div style="background: rgba(141, 110, 99, 0.08); border-radius: 8px; padding: 12px 16px; margin: 20px 0; border: 1px solid rgba(141, 110, 99, 0.2);">
                        <p style="font-size: 12px; color: #5D4037; margin: 0;">
                            ⚠️ <strong>Security tip:</strong> Never share this link with anyone. WordWeft will never ask for your password via email.
                        </p>
                    </div>
                    <p style="font-size: 13px; color: #A1887F; text-align: center; margin-top: 32px; border-top: 1px solid #EFEBE9; padding-top: 20px;">
                        — The WordWeft Team
                    </p>
                </div>
            </div>
            """.formatted(resetLink);

        sendHtmlEmail(toEmail, subject, html);
    }

    @Async
    public void sendOtpEmail(String toEmail, String otp) {
        String subject = "Your WordWeft Verification Code";
        String html = """
            <div style="font-family: 'Literata', 'Segoe UI', serif; max-width: 600px; margin: 0 auto; background: #FBF9F6; border-radius: 16px; overflow: hidden; border: 1px solid #D7CCC8;">
                <div style="background: #3E2723; padding: 40px 32px; text-align: center;">
                    <h1 style="color: #FFFFFF; margin: 0; font-family: 'Inter', sans-serif; font-size: 28px; font-weight: 700;">Verify Your Email</h1>
                    <p style="color: #D7CCC8; margin: 8px 0 0; font-family: 'Inter', sans-serif; font-size: 16px;">Almost there!</p>
                </div>
                <div style="padding: 32px; text-align: center; background: #FFFFFF;">
                    <p style="font-size: 16px; color: #5D4037; line-height: 1.6; margin-bottom: 24px;">
                        Enter the following 6-digit code to verify your email address and complete your WordWeft registration:
                    </p>
                    <div style="background: #FBF9F6; border: 1px solid #D7CCC8; border-radius: 12px; padding: 24px; display: inline-block; margin-bottom: 24px; letter-spacing: 4px;">
                        <span style="font-size: 32px; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: #3E2723;">%s</span>
                    </div>
                    <p style="font-size: 14px; color: #8D6E63; line-height: 1.6;">
                        This code will expire in <strong>10 minutes</strong>.
                    </p>
                    <p style="font-size: 13px; color: #A1887F; text-align: center; margin-top: 32px; border-top: 1px solid #EFEBE9; padding-top: 20px;">
                        If you didn't request this code, you can safely ignore this email.<br/>
                        — The WordWeft Team
                    </p>
                </div>
            </div>
            """.formatted(otp);

        sendHtmlEmail(toEmail, subject, html);
    }

    private void sendHtmlEmail(String toEmail, String subject, String htmlContent) {
        if (appsScriptUrl == null || appsScriptUrl.trim().isEmpty()) {
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
