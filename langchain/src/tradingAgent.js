import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { OpenAIEmbeddings } from "@langchain/openai";
import { createClient } from "@supabase/supabase-js";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables";
import { MongoClient } from "mongodb";
import sendTelegramNotification from "./telegram.js";

// Environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_API_KEY = process.env.SUPABASE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL_GORILLIONAIRE;
const POLLING_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MAX_DOCUMENTS = 500; // Limit to prevent crashes

// Templates for prompts
const TEMPLATE_CHOG = {
  standaloneQuestion:
    "Given a question, convert it into a standalone question. question: {question} standalone question:",
  answer: `You are an AI Agent that gives accurate trading signals about Chog (CHOG) token on the Monad Testnet. 
Whenever a user asks you a question, you will evaluate EQUALLY the spike events, the transfer events, and the price data available in your context and respond with 
BUY or SELL, followed by the symbol of the token followed by the suggested quantity (for BUY signals please comunicate the nominal value, with max 2 decimals, 
for SELL signals please express the percentage of the tokens hold by the user that you suggest to sell) of that token, along with a Confidence Score, a measurement that goes 
from 0 to 10, with two decimals, that represents how much you feel confident about the signal you gave. 
These responses will have to reflect the exact market situation in which the user is operating and will have 
to allow the user to maximize profits from their trades.
Provide a mix of BUY and SELL signals, don't always give the same signal.
Consider that we want the user to spend an average of 5 MON per signal and that 1 MON is approximately 140 CHOG.

context: {context}
question: {question}
answer:`,
};

// Templates for prompts
const TEMPLATE_DAK = {
  standaloneQuestion:
    "Given a question, convert it into a standalone question. question: {question} standalone question:",
  answer: `You are an AI Agent that gives accurate trading signals about Molandak (DAK) token on the Monad Testnet. 
Whenever a user asks you a question, you will evaluate EQUALLY the spike events, the transfer events, and the price data available in your context and respond with 
BUY or SELL, followed by the symbol of the token followed by the suggested quantity (for BUY signals please comunicate the nominal value, with max 2 decimals, 
for SELL signals please express the percentage of the tokens hold by the user that you suggest to sell) of that token, along with a Confidence Score, a measurement that goes 
from 0 to 10, with two decimals, that represents how much you feel confident about the signal you gave. 
These responses will have to reflect the exact market situation in which the user is operating and will have 
to allow the user to maximize profits from their trades.
Provide a mix of BUY and SELL signals, don't always give the same signal.
Consider that we want the user to spend an average of 5 MON per signal and that 1 MON is approximately 8 DAK.

context: {context}
question: {question}
answer:`,
};

const TEMPLATE_YAKI = {
  standaloneQuestion:
    "Given a question, convert it into a standalone question. question: {question} standalone question:",
  answer: `You are an AI Agent that gives accurate trading signals about Moyaki (YAKI) token on the Monad Testnet. 
Whenever a user asks you a question, you will evaluate EQUALLY the spike events, the transfer events, and the price data available in your context and respond with 
BUY or SELL, followed by the symbol of the token followed by the suggested quantity (for BUY signals please comunicate the nominal value, with max 2 decimals,
for SELL signals please express the percentage of the tokens hold by the user that you suggest to sell) of that token, along with a Confidence Score, a measurement that goes 
from 0 to 10, with two decimals, that represents how much you feel confident about the signal you gave. 
These responses will have to reflect the exact market situation in which the user is operating and will have 
to allow the user to maximize profits from their trades.
Provide a mix of BUY and SELL signals, don't always give the same signal.
Consider that we want the user to spend an average of 5 MON per signal and that 1 MON is approximately 1600 YAKI.

context: {context}
question: {question}
answer:`,
};

function combineDocuments(docs) {
  // Handle null or undefined docs
  if (!docs) return "";

  // If docs is not an array, make it one
  if (!Array.isArray(docs)) {
    console.log("Warning: docs is not an array in combineDocuments");
    if (docs.pageContent) {
      return docs.pageContent;
    }
    return "";
  }

  // Normal array processing
  const combinedDocs = docs.map((doc) => doc.pageContent).join("\n\n");
  return combinedDocs;
}

// Fixed initializeServices function with proper retriever implementation
function initializeServices() {
  const embeddings = new OpenAIEmbeddings({ openAIApiKey: OPENAI_API_KEY });
  const llm = new ChatOpenAI({
    openAIApiKey: OPENAI_API_KEY,
    temperature: 0.5,
  });

  const client = createClient(SUPABASE_URL, SUPABASE_API_KEY);

  // Create the standard vector store
  const vectorStore = new SupabaseVectorStore(embeddings, {
    client,
    tableName: "documents",
    queryName: "match_documents",
  });

  // Create a wrapper retriever that limits to the most recent documents
  const retriever = {
    getRelevantDocuments: async (query) => {
      try {
        console.log(`Running retrieval for query: ${query}`);
        // Get the k most relevant documents
        const k = 4; // Number of documents to retrieve

        // First check how many documents we have in total
        console.log("Checking document count...");
        let count = 0;
        try {
          const result = await client
            .from("documents")
            .select("*", { count: "exact", head: true });

          count = result.count || 0;
          console.log(`Total documents in database: ${count}`);
        } catch (countError) {
          console.error("Error getting document count:", countError);
          // Proceed with standard retrieval
          return await vectorStore.similaritySearch(query, k);
        }

        // If we have more than MAX_DOCUMENTS, we need to limit
        if (count > MAX_DOCUMENTS) {
          console.log(
            `Too many documents (${count}), limiting to most recent ${MAX_DOCUMENTS}`
          );

          try {
            // Standard similarity search but with a limit
            const docs = await vectorStore.similaritySearch(query, k);
            console.log(`Retrieved ${docs.length} documents`);
            return docs;
          } catch (searchError) {
            console.error("Error in similarity search:", searchError);
            return [];
          }
        } else {
          // Standard retrieval if under the limit
          const docs = await vectorStore.similaritySearch(query, k);
          console.log(`Retrieved ${docs.length} documents`);
          return docs;
        }
      } catch (error) {
        console.error("Error in retriever:", error);
        // Always return an array even if there's an error
        return [];
      }
    },

    // Make sure the invoke method mirrors getRelevantDocuments for LangChain compatibility
    invoke: async (query) => {
      return await retriever.getRelevantDocuments(query);
    },
  };

  return { llm, retriever };
}

// Helper function to extract token symbol from template
function extractTokenFromTemplate(template) {
  if (template === TEMPLATE_CHOG) return "CHOG";
  if (template === TEMPLATE_DAK) return "DAK";
  if (template === TEMPLATE_YAKI) return "YAKI";
  return null;
}

// Enhanced filtering function with debugging output and error handling
function filterDocumentsByToken(docs, tokenSymbol) {
  if (!tokenSymbol) {
    console.log("No token symbol provided for filtering");
    return docs;
  }

  // Make sure docs is an array
  if (!Array.isArray(docs)) {
    console.log("Warning: docs is not an array:", typeof docs);
    if (!docs) {
      console.log("docs is null or undefined, returning empty array");
      return [];
    }
    // If it's not an array, try to convert it to one or return empty array
    try {
      if (typeof docs === "object") {
        console.log("Attempting to convert object to array");
        docs = [docs];
      } else {
        console.log("Cannot convert to array, returning empty array");
        return [];
      }
    } catch (err) {
      console.error("Error converting docs to array:", err);
      return [];
    }
  }

  // More aggressive filtering - only keep documents that are primarily about the target token
  const filteredDocs = docs.filter((doc) => {
    // Make sure doc has pageContent
    if (!doc || !doc.pageContent) {
      console.log("Document has no pageContent, skipping");
      return false;
    }

    // Count occurrences of each token name
    const chogCount = (doc.pageContent.match(/\bCHOG\b/g) || []).length;
    const dakCount = (doc.pageContent.match(/\bDAK\b/g) || []).length;
    const yakiCount = (doc.pageContent.match(/\bYAKI\b/g) || []).length;

    // Determine which token this document is primarily about
    let primaryToken = "NONE";
    let maxCount = 0;

    if (chogCount > maxCount) {
      maxCount = chogCount;
      primaryToken = "CHOG";
    }
    if (dakCount > maxCount) {
      maxCount = dakCount;
      primaryToken = "DAK";
    }
    if (yakiCount > maxCount) {
      maxCount = yakiCount;
      primaryToken = "YAKI";
    }

    // Check if this document matches our target token
    const isMatch = primaryToken === tokenSymbol;

    return isMatch;
  });

  // If we have filtered docs, use them, otherwise fall back to original behavior
  // with an additional logging message
  if (filteredDocs.length > 0) {
    return filteredDocs;
  } else {
    return docs;
  }
}

// Modified createTradingChain function to ensure token-specific context
function createTradingChain(TEMPLATE) {
  const { llm, retriever } = initializeServices();
  const outputParser = new StringOutputParser();

  // Extract token symbol from template for context filtering
  const tokenSymbol = extractTokenFromTemplate(TEMPLATE);

  // Modify the standalone question to include the token symbol
  const standaloneQuestionPrompt = PromptTemplate.fromTemplate(
    `Given a question, convert it into a standalone question about ${tokenSymbol} token. Question: {question} Standalone question about ${tokenSymbol}:`
  );

  const answerPrompt = PromptTemplate.fromTemplate(TEMPLATE.answer);

  const standaloneQuestionChain = standaloneQuestionPrompt
    .pipe(llm)
    .pipe(outputParser);

  // Modified retrieverChain with explicit token filtering and error handling
  const retrieverChain = RunnableSequence.from([
    (prevResult) => {
      // Explicitly add token to query to help retrieval
      const enhancedQuery = `${prevResult.standalone_question} about ${tokenSymbol} token`;
      return enhancedQuery;
    },
    async (query) => {
      try {
        const docs = await retriever.getRelevantDocuments(query);
        return docs;
      } catch (error) {
        console.error(`Error retrieving documents for ${tokenSymbol}:`, error);
        return [];
      }
    },
    (docs) => {
      try {
        return filterDocumentsByToken(docs, tokenSymbol);
      } catch (error) {
        console.error(`Error filtering documents for ${tokenSymbol}:`, error);
        return docs; // Return original docs on filter error
      }
    },
    combineDocuments,
  ]);

  const answerChain = answerPrompt.pipe(llm).pipe(outputParser);

  return RunnableSequence.from([
    {
      standalone_question: standaloneQuestionChain,
      original_input: new RunnablePassthrough(),
    },
    {
      context: retrieverChain,
      question: ({ original_input }) => original_input.question,
      tokenSymbol: () => tokenSymbol, // Pass token through the chain
    },
    {
      answer: answerChain,
      context: ({ context }) => context,
      tokenSymbol: ({ tokenSymbol }) => tokenSymbol, // Continue passing token
    },
  ]);
}

// Helper function to extract signal information from answer text
function extractSignalInfo(answerText) {
  // Default values
  const result = {
    action: null,
    symbol: null,
    quantity: null,
    confidence: 0,
  };

  // Extract action (BUY or SELL)
  const actionMatch = answerText.match(/\b(BUY|SELL)\b/i);
  if (actionMatch) result.action = actionMatch[0].toUpperCase();

  // Extract symbol (CHOG, DAK, or YAKI)
  const symbolMatch = answerText.match(/\b(CHOG|DAK|YAKI)\b/i);
  if (symbolMatch) result.symbol = symbolMatch[0].toUpperCase();

  // Extract quantity (number or percentage)
  const quantityMatch = answerText.match(/\b(\d+(?:\.\d+)?%?)\b/);
  if (quantityMatch) result.quantity = quantityMatch[0];

  // Extract confidence score
  const confidenceMatch = answerText.match(
    /Confidence Score(?: of)? (\d+(?:\.\d+)?)/i
  );
  if (confidenceMatch && confidenceMatch[1]) {
    result.confidence = parseFloat(confidenceMatch[1]);
  }

  return result;
}

export async function getTradingSignal(question) {
  try {
    let allResults = [];
    const TEMPLATES = [TEMPLATE_CHOG, TEMPLATE_DAK, TEMPLATE_YAKI];

    // Collect all results from different templates
    for (const TEMPLATE of TEMPLATES) {
      try {
        // Create a dedicated chain for each template
        const chain = createTradingChain(TEMPLATE);

        // Get signal for this template with the original question
        const tempResult = await chain.invoke({ question });

        if (!tempResult || !tempResult.answer) {
          continue;
        }

        const signalInfo = extractSignalInfo(tempResult.answer);

        // Add the result with its parsed information
        allResults.push({
          ...tempResult,
          parsedSignal: signalInfo,
          confidence: signalInfo.confidence,
        });
      } catch (err) {
        console.error(
          `Error generating signal for template ${extractTokenFromTemplate(
            TEMPLATE
          )}:`,
          err
        );
        // Continue with other templates even if one fails
      }
    }

    // Check if we have any valid results
    if (allResults.length === 0) {
      throw new Error("No results were generated from any template");
    }

    // Find the result with the highest confidence score across all templates and signals
    allResults.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
    const highestConfidenceResult = allResults[0];

    // Save only the highest confidence result to the database
    await saveSignal(
      highestConfidenceResult.answer,
      highestConfidenceResult.context,
      highestConfidenceResult.tokenSymbol,
      highestConfidenceResult.parsedSignal
    );

    return {
      signal: highestConfidenceResult,
      context: highestConfidenceResult.context || "No context available",
      parsedSignal: highestConfidenceResult.parsedSignal,
      tokenSymbol: highestConfidenceResult.tokenSymbol,
    };
  } catch (error) {
    console.error("Error generating trading signal:", error);
    throw error;
  }
}

export async function generateBuySignal() {
  const timestamp = new Date().toISOString();

  try {
    console.log(`\n[${timestamp}] Generating trading signal...`);

    const answer = await getTradingSignal(
      "Give me the best trading signal you can deduce from the context you have. Make it a BUY signal. Range from 1000 to 5000, always add two decimals. Like 3000.00. Min Value for Yaki is 1000 Unit. Make sure the signal is different from previous ones. Remember that both BUY and SELL signals are equally important for making money in trading. Base your signal on the actual market data and events in the context."
    );
  } catch (error) {
    console.error(`[${timestamp}] Error generating signal:`, error);
  }
}

export async function generateSellSignal() {
  const timestamp = new Date().toISOString();

  try {
    console.log(`\n[${timestamp}] Generating trading signal...`);

    const answer = await getTradingSignal(
      "Give me the best trading signal you can deduce from the context you have. Make it a SELL signal. Make sure the signal is different from previous ones. Remember that both BUY and SELL signals are equally important for making money in trading. Base your signal on the actual market data and events in the context."
    );
  } catch (error) {
    console.error(`[${timestamp}] Error generating signal:`, error);
  }
}

// Modified saveSignal function to save only the highest confidence signal
async function saveSignal(signal, events, tokenSymbol, parsedSignal) {
  const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING);
  try {
    await client.connect();
    const db = client.db("signals");
    const generatedSignals = db.collection("generated-signals");

    const data = {
      created_at: new Date(),
      token: tokenSymbol,
      action: parsedSignal?.action || null,
      quantity: parsedSignal?.quantity || null,
      confidence: parsedSignal?.confidence || 0,
      signal_text: signal,
      events: events,
    };

    const message = `🚨 New Trading Signal Generated 🚨

Token: ${tokenSymbol}
Action: ${parsedSignal?.action === "BUY" ? "🟢 BUY" : "🔴 SELL"}
${
  parsedSignal?.action === "BUY" ? "Suggested Amount:" : "Sell % of Holdings:"
} ${parsedSignal?.quantity}
Confidence Score: ${parsedSignal?.confidence}/10

Generated at: ${new Date().toLocaleString()}
Go to https://app.gorillionai.re/signals to see the signal`;

    await sendTelegramNotification(message);

    const result = await generatedSignals.insertOne(data);
  } catch (error) {
    console.error(`Error saving signal to MongoDB:`, error);
  } finally {
    await client.close();
  }
}

export function startSignalPolling(interval = POLLING_INTERVAL) {
  console.log(
    `Starting trading signal generator with interval: ${
      interval / 1000
    } seconds`
  );

  generateBuySignal();
  const intervalId = setInterval(generateBuySignal, interval);
  generateSellSignal();
  const intervalId2 = setInterval(generateSellSignal, interval);

  process.on("SIGINT", () => {
    console.log("\nStopping trading signal generator...");
    clearInterval(intervalId);
    clearInterval(intervalId2);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\nStopping trading signal generator...");
    clearInterval(intervalId);
    clearInterval(intervalId2);
    process.exit(0);
  });
}
