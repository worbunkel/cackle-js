import { RequestManager } from 'cackle-js';
import { Zeus } from './generated/graphql-zeus';
import { request } from 'graphql-request';

const url = 'https://faker.graphqleditor.com/aexol/olympus/graphql';

// I'm using graphql-request in this example, but you could use fetch or any other request handler.
const queryHandler = (query: string) => request(url, query);

const requestManager = new RequestManager(queryHandler);

const createZeusQuery = (query: Parameters<typeof Zeus.Query>[0]) => {
  const stringGql = Zeus.Query(query);
  return requestManager.createQuery(stringGql);
};

const createZeusMutation = (mutation: Parameters<typeof Zeus.Mutation>[0]) => {
  const stringGql = Zeus.Mutation(mutation);
  return requestManager.createMutation(stringGql);
};

const listCards = async () => {
  return createZeusQuery({
    listCards: {
      name: true,
      skills: true,
      Attack: true,
    },
  });
};

const addCard = async () => {
  return createZeusMutation({
    addCard: [
      { card: { name: 'New Card', Attack: 12345, Defense: 54321, description: 'A new card' } },
      { name: true, skills: true, Attack: true },
    ],
  });
};
(async () => {
  const cards = await listCards();
  const newCard = await addCard();
  console.log(JSON.stringify(cards, null, 2));
  console.log(JSON.stringify(newCard, null, 2));
})();
