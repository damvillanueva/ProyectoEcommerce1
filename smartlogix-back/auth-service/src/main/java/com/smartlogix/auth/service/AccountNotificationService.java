package com.smartlogix.auth.service;

import com.smartlogix.auth.domain.UserEntity;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class AccountNotificationService {

    private final JavaMailSender mailSender;
    private final String frontendUrl;
    private final String fromAddress;

    public AccountNotificationService(
            JavaMailSender mailSender,
            @Value("${smartlogix.frontend-url:http://127.0.0.1:5174}") String frontendUrl,
            @Value("${smartlogix.mail.from:no-reply@smartlogix.local}") String fromAddress) {
        this.mailSender = mailSender;
        this.frontendUrl = frontendUrl.replaceAll("/+$", "");
        this.fromAddress = fromAddress;
    }

    public void sendEmailVerification(UserEntity user, String token) {
        String link = frontendUrl + "/shop/verify-email?token=" + encode(token);
        send(
                user.getEmail(),
                "Verifica tu cuenta SmartLogix",
                "Hola " + displayName(user) + ",\n\n"
                        + "Confirma tu correo abriendo este enlace:\n" + link + "\n\n"
                        + "El enlace vence pronto. Si no creaste la cuenta, ignora este mensaje."
        );
    }

    public void sendPasswordReset(UserEntity user, String token) {
        String link = frontendUrl + "/shop/reset-password?token=" + encode(token);
        send(
                user.getEmail(),
                "Recupera tu acceso a SmartLogix",
                "Hola " + displayName(user) + ",\n\n"
                        + "Puedes definir una nueva contrasena aquí:\n" + link + "\n\n"
                        + "El enlace vence en 30 minutos. Si no solicitaste el cambio, ignora este mensaje."
        );
    }

    private void send(String recipient, String subject, String body) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }

    private String displayName(UserEntity user) {
        return user.getDisplayName() == null || user.getDisplayName().isBlank()
                ? user.getUsername()
                : user.getDisplayName();
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
