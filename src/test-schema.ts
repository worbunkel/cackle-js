import { graphql, buildSchema } from 'graphql';

var schema = buildSchema(`
type Mutation {
  addTodo(newTodo: NewTodoInput!): Todo!
}

input NewTodoInput {
  name: String!
  isComplete: Boolean!
}

type Query {
  todo(name: String!): Todo
  todos: [Todo!]!
}

type Todo {
  name: String!
  isComplete: Boolean!
}
`);

type Todo = {
  name: string;
  isComplete: boolean;
};

const getDefaultTodos = () => [
  {
    name: 'Brush Teeth',
    isComplete: true,
  },
];

class FakeDB {
  private todos: Todo[] = [];
  constructor() {
    this.todos = getDefaultTodos();
  }
  getTodos() {
    return this.todos;
  }
  getTodoByName(name: string) {
    return this.todos.find(todo => todo.name === name);
  }
  addTodo(newTodo: Todo) {
    this.todos.push(newTodo);
    return newTodo;
  }
  reset() {
    this.todos = getDefaultTodos();
  }
}

const fakeDB = new FakeDB();

var root = {
  todos: () => {
    return fakeDB.getTodos();
  },
  todo: ({ name }: { name: string }): Todo | undefined => {
    return fakeDB.getTodoByName(name);
  },
  addTodo: ({ newTodo }: { newTodo: Todo }) => {
    return fakeDB.addTodo(newTodo);
  },
};

export const resetTestDB = () => {
  fakeDB.reset();
};

export const queryTestSchema = (query: string) => graphql(schema, query, root);
