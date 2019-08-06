import { graphql, buildSchema, printSchema } from 'graphql';

var schema = buildSchema(`
type Mutation {
  addTodo(newTodo: NewTodoInput!): Todo!
  addTodos(newTodos: [NewTodoInput!]!): [Todo!]!
}

input NewTodoInput {
  name: String!
  isComplete: Boolean!
  user: NewUserInput
}

input NewUserInput {
  firstName: String!
  lastName: String!
}

type Query {
  todo(name: String!): Todo
  todos: [Todo!]!
}

type Todo {
  name: String!
  isComplete: Boolean!
  user: User!
}

type User {
  firstName: String!
  lastName: String!
  todos: [Todo!]!
}
`);

console.log(printSchema(schema));

type User = {
  firstName: string;
  lastName: string;
};

type Todo = {
  name: string;
  isComplete: boolean;
  user: User;
};

const getDefaultTodos = () => [
  {
    name: 'Brush Teeth',
    isComplete: true,
    user: {
      firstName: 'Test',
      lastName: 'User',
      todos: [
        {
          name: 'Brush Teeth',
          isComplete: true,
        },
      ],
    },
  },
  {
    name: 'Do Chores',
    isComplete: false,
    user: {
      firstName: 'Test',
      lastName: 'User2',
      todos: [
        {
          name: 'Do Chores',
          isComplete: false,
        },
      ],
    },
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
  addTodos(newTodos: Todo[]) {
    this.todos = this.todos.concat(newTodos);
    return newTodos;
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
  addTodos: ({ newTodos }: { newTodos: Todo[] }) => {
    return fakeDB.addTodos(newTodos);
  },
};

export const resetTestDB = () => {
  fakeDB.reset();
};

export const queryTestSchema = async (query: string) => {
  try {
    return await graphql(schema, query, root);
  } catch (err) {
    console.error(err);
  }
};
