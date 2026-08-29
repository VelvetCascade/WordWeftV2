package com.wordweft.analytics.dto;

import java.util.Map;

public class AnalyticsEventDto {

    private String sessionId;
    private String category;
    private String action;
    private String label;
    private Double value;
    private String pagePath;
    private String referrerPage;
    private String deviceType;
    private String browser;
    private String screenSize;
    private String os;
    private Map<String, Object> metadata;

    public AnalyticsEventDto() {}

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Double getValue() { return value; }
    public void setValue(Double value) { this.value = value; }

    public String getPagePath() { return pagePath; }
    public void setPagePath(String pagePath) { this.pagePath = pagePath; }

    public String getReferrerPage() { return referrerPage; }
    public void setReferrerPage(String referrerPage) { this.referrerPage = referrerPage; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }

    public String getScreenSize() { return screenSize; }
    public void setScreenSize(String screenSize) { this.screenSize = screenSize; }

    public String getOs() { return os; }
    public void setOs(String os) { this.os = os; }

    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
}
