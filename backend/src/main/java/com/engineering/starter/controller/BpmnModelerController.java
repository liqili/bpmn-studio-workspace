package com.engineering.starter.controller;

import com.engineering.starter.dto.BpmnMutationRequest;
import com.engineering.starter.dto.BpmnMutationResponse;
import com.engineering.starter.service.BpmnAiEngineService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bpmn")
@CrossOrigin(origins = "http://localhost:3000")
public class BpmnModelerController {

    @Value("${openai.api.key}")
    private String apiKey;

    private final BpmnAiEngineService aiEngineService;

    public BpmnModelerController(BpmnAiEngineService aiEngineService) {
        this.aiEngineService = aiEngineService;
    }

    @PostMapping("/generate")
    public ResponseEntity<BpmnMutationResponse> mutateWorkflowLayout(@RequestBody BpmnMutationRequest request) {
        System.out.println("[Spring Boot 3.5] Passing prompt context to OpenAI: " + request.getUserRequest());

        try {
            var modifiedXml = aiEngineService.executeXmlMutation(request.getCurrentXml(), request.getUserRequest());            // Clean up any defensive model formatting responses safely on a single line
            modifiedXml = modifiedXml.replaceAll("```xml", "")
                    .replaceAll("```", "")
                         .replaceAll("\n", "")
                         .trim();

            return ResponseEntity.ok(new BpmnMutationResponse(modifiedXml));
        } catch (Exception e) {
            System.err.println("[ERROR] OpenAI interface execution pipeline failure: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

}