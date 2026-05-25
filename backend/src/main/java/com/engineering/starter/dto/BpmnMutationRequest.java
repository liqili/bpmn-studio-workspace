package com.engineering.starter.dto;

/**
 * Created by kunkka on 25/05/26
 */
public class BpmnMutationRequest {
    private String currentXml;
    private String userRequest;

    public String getCurrentXml() {
        return currentXml;
    }

    public void setCurrentXml(String currentXml) {
        this.currentXml = currentXml;
    }

    public String getUserRequest() {
        return userRequest;
    }

    public void setUserRequest(String userRequest) {
        this.userRequest = userRequest;
    }
}
