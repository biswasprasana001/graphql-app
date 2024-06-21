const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { createServer } = require('http');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { execute, subscribe } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { PubSub } = require('graphql-subscriptions');

// Initialize a new instance of PubSub for handling subscriptions
const pubsub = new PubSub();

// Define a constant for the subscription type
const MESSAGE_ADDED = 'MESSAGE_ADDED';

// Define GraphQL type definitions (schema)
const typeDefs = gql`
  type Message {
    id: ID!
    content: String!
  }

  type Query {
    messages: [Message!]
  }

  type Mutation {
    addMessage(content: String!): Message!
  }

  type Subscription {
    messageAdded: Message!
  }
`;

// Sample data to act as a database
const messages = [];

// Define GraphQL resolvers
const resolvers = {
  Query: {
    messages: () => messages,
  },
  Mutation: {
    addMessage: (_, { content }) => {
      const message = { id: messages.length + 1, content };
      messages.push(message);
      // Publish the new message to subscribers
      pubsub.publish(MESSAGE_ADDED, { messageAdded: message });
      return message;
    },
  },
  Subscription: {
    messageAdded: {
      // Subscribe to the MESSAGE_ADDED event
      subscribe: () => pubsub.asyncIterator([MESSAGE_ADDED]),
    },
  },
};

// Create an executable schema
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Initialize the Express application
const app = express();

// Create a function to start the server
async function startServer() {
  // Create an Apollo Server instance
  const server = new ApolloServer({
    schema,
  });

  // Apply middleware to connect Apollo Server with Express
  await server.start();
  server.applyMiddleware({ app });

  // Create an HTTP server to handle requests and subscriptions
  const httpServer = createServer(app);

  // Attach Subscription Server to the HTTP server
  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
    },
    {
      server: httpServer,
      path: server.graphqlPath,
    }
  );

  // Define the port and start listening for requests
  const PORT = 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}${server.graphqlPath}`);
  });
}

// Start the server
startServer();