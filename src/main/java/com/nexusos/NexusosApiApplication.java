package com.nexusos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class NexusosApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexusosApiApplication.class, args);
    }
}
