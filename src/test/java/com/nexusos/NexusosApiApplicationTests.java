package com.nexusos;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"nexusos.security.jwt.secret=MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIz",
		"spring.datasource.url=jdbc:postgresql://localhost:5432/nexusos",
		"spring.datasource.username=nexusos",
		"spring.datasource.password=nexusos"
})
class NexusosApiApplicationTests {

    @Test
    void contextLoads() {
    }
}
