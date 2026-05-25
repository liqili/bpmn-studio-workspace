package com.engineering.starter;

import com.engineering.starter.service.VectorService;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class BpmnStudioApplication {

    public static void main(String[] args) {
        SpringApplication.run(BpmnStudioApplication.class, args);
    }

    @Bean
    public ApplicationRunner vectorDataInitializer(VectorService vectorService) {
        return args -> {
            // Runs safely on startup right after the app context fully loads
            vectorService.prepareAndSeedVectors();
        };
    }
}