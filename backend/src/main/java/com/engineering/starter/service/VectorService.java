package com.engineering.starter.service;

import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.loader.FileSystemDocumentLoader;
import dev.langchain4j.data.document.parser.TextDocumentParser;
import dev.langchain4j.data.document.splitter.DocumentSplitters;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.EmbeddingStoreIngestor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.io.IOException;

@Service
public class VectorService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("classpath:bpmn-rules.txt")
    private Resource bpmnRulesResource;

    private final EmbeddingStore<TextSegment> embeddingStore;
    private final JdbcTemplate jdbcTemplate;

    // Constructor injection reuses your existing configuration beans smoothly
    public VectorService(EmbeddingStore<TextSegment> embeddingStore, JdbcTemplate jdbcTemplate) {
        this.embeddingStore = embeddingStore;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Prepares the database environment and seeds your local BPMN text rules
     * into PostgreSQL if the vector space is empty.
     */
    public void prepareAndSeedVectors() {
        // 1. Ensure the pgvector extension exists in the Postgres instance
        jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector;");

        // 2. Idempotency Check: Prevent duplicate embedding generation and API costs
        if (isVectorTablePopulated()) {
            System.out.println("BPMN Vector knowledge base is already initialized. Skipping ingestion.");
            return;
        }

        System.out.println("Initializing BPMN Knowledge base vectors via OpenAI API...");

        EmbeddingModel embeddingModel = OpenAiEmbeddingModel.builder()
                .apiKey(this.apiKey)
                .modelName("text-embedding-3-small") // High-efficiency, 1536-dimension architecture
                .build();

        try {
            // 3. Read raw schema text sheets from the classpath resources
            Document document = FileSystemDocumentLoader.loadDocument(
                    bpmnRulesResource.getFile().toPath(),
                    new TextDocumentParser()
            );

            // 4. Segment and parse rules text into chunks before vector transformation
            EmbeddingStoreIngestor ingestor = EmbeddingStoreIngestor.builder()
                    .documentSplitter(DocumentSplitters.recursive(400, 50)) // 400 char windows match our custom rule blocks
                    .embeddingModel(embeddingModel)
                    .embeddingStore(embeddingStore)
                    .build();

            ingestor.ingest(document);
            System.out.println("Successfully ingested BPMN specification tokens into PostgreSQL.");

        } catch (IOException e) {
            System.err.println("Critical failure loading seeding file structural records: " + e.getMessage());
            throw new RuntimeException("Vector database seeding routine aborted due to parsing failure", e);
        }
    }

    /**
     * Safe query checker. Prevents crashing if LangChain4j hasn't completed
     * execution of its automatic "CREATE TABLE IF NOT EXISTS" command yet.
     */
    private boolean isVectorTablePopulated() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM bpmn_knowledge_vectors", Integer.class);
            return count != null && count > 0;
        } catch (Exception e) {
            // Catches table relation missing states on a completely blank database initial boot
            return false;
        }
    }
}