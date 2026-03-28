package com.wordweft.config;

import io.imagekit.sdk.ImageKit;
import io.imagekit.sdk.config.Configuration;
import io.imagekit.sdk.utils.Utils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

@org.springframework.context.annotation.Configuration
public class ImageKitConfig {

    @Value("${imagekit.public-key:}")
    private String publicKey;

    @Value("${imagekit.private-key:}")
    private String privateKey;

    @Value("${imagekit.url-endpoint:https://ik.imagekit.io/wordweft/}")
    private String urlEndpoint;

    @Bean
    public ImageKit imageKit() {
        ImageKit imageKit = ImageKit.getInstance();
        Configuration config = new Configuration(publicKey, privateKey, urlEndpoint);
        imageKit.setConfig(config);
        return imageKit;
    }
}
