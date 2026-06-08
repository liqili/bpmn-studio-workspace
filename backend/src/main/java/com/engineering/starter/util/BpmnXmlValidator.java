package com.engineering.starter.util;

/**
 * Created by kunkka on 8/06/26
 */
import org.camunda.bpm.model.bpmn.Bpmn;
import org.camunda.bpm.model.bpmn.BpmnModelInstance;
import org.camunda.bpm.model.xml.ModelParseException;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

public class BpmnXmlValidator {

    public static void validate(String xml) {
        try {
            System.out.println(xml);
            ByteArrayInputStream inputStream =
                    new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8));

            BpmnModelInstance modelInstance = Bpmn.readModelFromStream(inputStream);

            // force full validation (not lazy)
            Bpmn.validateModel(modelInstance);

        } catch (ModelParseException e) {
            throw new IllegalArgumentException("Invalid BPMN XML structure: " + e.getMessage(), e);
        }
    }

    public static String stripDiagramSection(String xml) {
        if (xml == null) return null;

        // remove entire BPMNDI block
        return xml.replaceAll("(?s)<bpmndi:BPMNDiagram.*?</bpmndi:BPMNDiagram>", "")
                .trim();
    }

}
