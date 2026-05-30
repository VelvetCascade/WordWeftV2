package com.wordweft.analytics.dto;

public class SessionDto {

    private String sessionId;
    private String startTime;
    private String endTime;
    private int pageCount;
    private int eventCount;
    private String entryPage;
    private String exitPage;
    private String deviceType;
    private String browser;
    private String os;

    public SessionDto() {}

    public String getSessionId() { return sessionId; }
    public void setSessionId(String sessionId) { this.sessionId = sessionId; }

    public String getStartTime() { return startTime; }
    public void setStartTime(String startTime) { this.startTime = startTime; }

    public String getEndTime() { return endTime; }
    public void setEndTime(String endTime) { this.endTime = endTime; }

    public int getPageCount() { return pageCount; }
    public void setPageCount(int pageCount) { this.pageCount = pageCount; }

    public int getEventCount() { return eventCount; }
    public void setEventCount(int eventCount) { this.eventCount = eventCount; }

    public String getEntryPage() { return entryPage; }
    public void setEntryPage(String entryPage) { this.entryPage = entryPage; }

    public String getExitPage() { return exitPage; }
    public void setExitPage(String exitPage) { this.exitPage = exitPage; }

    public String getDeviceType() { return deviceType; }
    public void setDeviceType(String deviceType) { this.deviceType = deviceType; }

    public String getBrowser() { return browser; }
    public void setBrowser(String browser) { this.browser = browser; }

    public String getOs() { return os; }
    public void setOs(String os) { this.os = os; }
}
