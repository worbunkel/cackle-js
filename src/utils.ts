import _ from 'lodash';

export const createDeepNames = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    if (!selectionSet) {
      return selection.name.value;
    }
    return _.map(createDeepNames(selectionSet.selections), name => selection.name.value + '.' + name);
  });
};

export const createDeepAliases = (selections: any[]): any[] => {
  return _.flatMap(selections, selection => {
    const selectionSet = selection.selectionSet;
    const alias = _.get(selection, 'alias.value', selection.name.value);
    if (!selectionSet) {
      return alias;
    }
    return _.map(createDeepAliases(selectionSet.selections), childAlias => alias + '.' + childAlias);
  });
};

// TODO: Clean this up to be done in one loop
export const createDeepNamesAndAliases = (selections: any[]): { deepNames: any[]; deepAliases: any[] } => ({
  deepNames: _.map(selections, createDeepNames),
  deepAliases: _.map(selections, createDeepAliases),
});

export const printObjectQuery = (objectQuery: any): string => `{
  ${_.join(_.map(objectQuery, (value, key) => (value === '' ? key : `${key} ${printObjectQuery(value)}`)), '\n')}
}`;

export const delay = async (durationInMS: number) =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, durationInMS);
  });
