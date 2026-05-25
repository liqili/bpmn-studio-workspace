package com.engineering.starter.config;

import com.engineering.starter.agent.BpmnModifierAgent;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import dev.langchain4j.rag.content.retriever.ContentRetriever;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.store.embedding.EmbeddingStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AiServiceConfig {

    @Value("${openai.api.key}")
    private String apiKey;

    @Bean
    public ChatLanguageModel chatLanguageModel() {
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .modelName("gpt-4o-mini")
                .temperature(0.1)
                .logRequests(true)
                .logResponses(true)
                .build();
    }

    @Bean
    public EmbeddingModel embeddingModel() {
        return OpenAiEmbeddingModel.builder()
                .apiKey(apiKey)
                .modelName("text-embedding-3-small") // Must match the 1536 dimension set in VectorStoreConfig
                .build();
    }

    @Bean
    public ContentRetriever contentRetriever(EmbeddingStore<TextSegment> embeddingStore, EmbeddingModel embeddingModel) {
        // This bridges your Postgres vector table directly to your prompt executions
        return EmbeddingStoreContentRetriever.builder()
                .embeddingStore(embeddingStore)
                .embeddingModel(embeddingModel)
                .maxResults(3)           // Number of relevant text fragments to retrieve
                .minScore(0.6)           // Ignores completely unrelated context snippets
                .build();
    }

    @Bean
    public BpmnModifierAgent bpmnModifierAgent(ChatLanguageModel chatLanguageModel, ContentRetriever contentRetriever) {
        // Linking the contentRetriever here satisfies and populates the {{information}} placeholder
        return AiServices.builder(BpmnModifierAgent.class)
                .chatLanguageModel(chatLanguageModel)
//                .contentRetriever(contentRetriever)
                .build();
    }
}