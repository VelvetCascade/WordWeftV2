package com.wordweft.support;

import io.imagekit.sdk.ImageKit;
import io.imagekit.sdk.exceptions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ImageKitService {

    @Autowired
    private ImageKit imageKit;

    public void deleteFile(String fileId) {
        if (fileId == null || fileId.trim().isEmpty()) {
            return;
        }
        try {
            // Check if file is provided
            imageKit.deleteFile(fileId);
        } catch (ForbiddenException | TooManyRequestsException | InternalServerException | UnauthorizedException
                | BadRequestException | UnknownException e) {
            // Log the error but don't fail the request since it's just a cleanup task
            System.err.println("Failed to delete ImageKit file: " + fileId + ". Reason: " + e.getMessage());
        }
    }
}
