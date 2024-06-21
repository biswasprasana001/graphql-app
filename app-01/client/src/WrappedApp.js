// Import necessary modules from React and Apollo Client
import React, { useState, useEffect } from 'react';
import {
    ApolloClient,
    InMemoryCache,
    ApolloProvider,
    useQuery,
    useMutation,
    useSubscription,
    gql,
    split,
} from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { HttpLink } from '@apollo/client/link/http';
import { getMainDefinition } from '@apollo/client/utilities';

// Define GraphQL queries, mutations, and subscriptions
const GET_MESSAGES = gql`
  query GetMessages {
    messages {
      id
      content
    }
  }
`;

const ADD_MESSAGE = gql`
  mutation AddMessage($content: String!) {
    addMessage(content: $content) {
      id
      content
    }
  }
`;

const MESSAGE_ADDED = gql`
  subscription OnMessageAdded {
    messageAdded {
      id
      content
    }
  }
`;

// Create a WebSocket link for subscriptions
const wsLink = new WebSocketLink({
    uri: `ws://localhost:4000/graphql`,
    options: {
        reconnect: true,
    },
});

// Create an HTTP link for queries and mutations
const httpLink = new HttpLink({
    uri: 'http://localhost:4000/graphql',
});

// Split links based on operation type (subscription vs query/mutation)
const splitLink = split(
    ({ query }) => {
        const definition = getMainDefinition(query);
        return (
            definition.kind === 'OperationDefinition' &&
            definition.operation === 'subscription'
        );
    },
    wsLink,
    httpLink
);

// Create Apollo Client instance
const client = new ApolloClient({
    link: splitLink,
    cache: new InMemoryCache(),
});

// Define the main App component
function App() {
    // Use state hooks to manage input and messages
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);

    // Fetch messages using the GET_MESSAGES query
    const { data } = useQuery(GET_MESSAGES);

    // Define the ADD_MESSAGE mutation
    const [addMessage] = useMutation(ADD_MESSAGE);

    // Handle message addition using the mutation
    const handleAddMessage = async () => {
        if (message.trim()) {
            await addMessage({ variables: { content: message } });
            setMessage('');
        }
    };

    // Use the MESSAGE_ADDED subscription
    const { data: subscriptionData } = useSubscription(MESSAGE_ADDED);

    // Update the messages list when new message is received via subscription
    useEffect(() => {
        if (subscriptionData) {
            setMessages((prevMessages) => [
                ...prevMessages,
                subscriptionData.messageAdded,
            ]);
        }
    }, [subscriptionData]);

    // Render the component
    return (
        <div>
            <h1>GraphQL Subscriptions with Apollo Client</h1>
            <div>
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
                <button onClick={handleAddMessage}>Send</button>
            </div>
            <ul>
                {data?.messages.map((msg) => (
                    <li key={msg.id}>{msg.content}</li>
                ))}
                {messages.map((msg) => (
                    <li key={msg.id}>{msg.content}</li>
                ))}
            </ul>
        </div>
    );
}

// Wrap the App component with ApolloProvider to provide Apollo Client instance
export default function WrappedApp() {
    return (
        <ApolloProvider client={client}>
            <App />
        </ApolloProvider>
    );
}