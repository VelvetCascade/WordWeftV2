package com.wordweft.analytics.dto;

import java.util.List;

public class AnalyticsBatchDto {

    private List<AnalyticsEventDto> events;
    private SessionDto session;

    public AnalyticsBatchDto() {}

    public List<AnalyticsEventDto> getEvents() { return events; }
    public void setEvents(List<AnalyticsEventDto> events) { this.events = events; }

    public SessionDto getSession() { return session; }
    public void setSession(SessionDto session) { this.session = session; }
}
