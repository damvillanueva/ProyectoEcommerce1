package com.smartlogix.order.config;

import com.smartlogix.order.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/actuator/health",
                                "/actuator/info",
                                "/actuator/prometheus").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/discounts/validate")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_USER", "ROLE_CUSTOMER")
                        .requestMatchers("/api/discounts/**").hasAuthority("ROLE_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/orders")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_USER", "ROLE_CUSTOMER")
                        .requestMatchers(HttpMethod.POST, "/api/orders/shipping-quote")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_USER", "ROLE_CUSTOMER")
                        .requestMatchers(HttpMethod.GET, "/api/orders/mine", "/api/orders/mine/**")
                        .hasAuthority("ROLE_CUSTOMER")
                        .requestMatchers(HttpMethod.POST, "/api/orders/mine/*/cancel")
                        .hasAuthority("ROLE_CUSTOMER")
                        .requestMatchers("/api/orders/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_USER")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
