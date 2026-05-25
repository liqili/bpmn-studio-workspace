package com.engineering.starter.dto;

/**
 * Created by kunkka on 25/05/26
 */
public class BpmnMutationResponse {
    private String newXml;

    public BpmnMutationResponse(String newXml) {
        this.newXml = newXml;
    }

    public String getNewXml() {
        return newXml;
    }

    public void setNewXml(String newXml) {
        this.newXml = newXml;
    }
}
