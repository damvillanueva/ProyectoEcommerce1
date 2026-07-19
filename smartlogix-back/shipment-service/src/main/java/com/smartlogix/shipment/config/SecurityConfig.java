package com.smartlogix.shipment.config;

import com.smartlogix.shipment.security.JwtAuthenticationFilter;
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
                        .requestMatchers(HttpMethod.POST, "/api/shipments", "/api/shipments/")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER", "ROLE_ORDER_SERVICE")
                        .requestMatchers(HttpMethod.GET, "/api/shipments/*")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER", "ROLE_ORDER_SERVICE")
                        .requestMatchers(HttpMethod.PUT, "/api/shipments/*")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER", "ROLE_ORDER_SERVICE")
                        .requestMatchers(HttpMethod.DELETE, "/api/shipments/*")
                        .hasAnyAuthority("ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER", "ROLE_ORDER_SERVICE")
                        .requestMatchers("/api/shipments/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_WAREHOUSE_MANAGER")
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
