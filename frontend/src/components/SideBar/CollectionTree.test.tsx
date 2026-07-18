import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CollectionNode, RequestType } from '../../types';
import { CollectionTree, filterCollectionTree } from './CollectionTree';

const requestNode = (
  id: string,
  name: string,
  method: string
): CollectionNode => ({
  id,
  type: 'request',
  name,
  requestData: {
    id,
    type: RequestType.RPC,
    name,
    rpcParams: { method, params: [] },
    moveParams: {
      packageId: '',
      module: '',
      function: '',
      typeArguments: [],
      arguments: [],
      gasBudget: ''
    }
  }
});

const collections: CollectionNode[] = [
  {
    id: 'objects',
    type: 'collection',
    name: 'Object APIs',
    isExpanded: false,
    children: [
      requestNode('get-object', 'Read object', 'sui_getObject'),
      requestNode('list-events', 'List events', 'suix_queryEvents')
    ]
  },
  {
    id: 'transactions',
    type: 'collection',
    name: 'Transaction APIs',
    isExpanded: true,
    children: [
      requestNode('execute', 'Execute transaction', 'sui_executeTransactionBlock')
    ]
  }
];

const renderTree = (filterQuery: string) => render(
  <CollectionTree
    collections={collections}
    filterQuery={filterQuery}
    activeTabId={null}
    onToggleExpand={vi.fn()}
    onSelectCollectionRequest={vi.fn()}
    onCreateCollection={vi.fn()}
  />
);

describe('filterCollectionTree', () => {
  it('returns the original tree for a blank query', () => {
    expect(filterCollectionTree(collections, '   ')).toBe(collections);
  });

  it('matches request names case-insensitively and preserves ancestors', () => {
    const result = filterCollectionTree(collections, 'READ OBJECT');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Object APIs');
    expect(result[0].children?.map((node) => node.name)).toEqual([
      'Read object'
    ]);
  });

  it('matches RPC methods and excludes unrelated branches', () => {
    const result = filterCollectionTree(collections, 'queryevents');

    expect(result).toHaveLength(1);
    expect(result[0].children?.map((node) => node.id)).toEqual([
      'list-events'
    ]);
  });

  it('keeps a matching collection and its complete subtree', () => {
    const result = filterCollectionTree(collections, 'object APIs');

    expect(result[0].children).toBe(collections[0].children);
  });
});

describe('CollectionTree filtered rendering', () => {
  it('reveals matching descendants even when their ancestor is collapsed', () => {
    renderTree('sui_getObject');

    expect(screen.getByText('Object APIs')).toBeInTheDocument();
    expect(screen.getByText('Read object')).toBeInTheDocument();
    expect(screen.queryByText('List events')).not.toBeInTheDocument();
    expect(screen.queryByText('Transaction APIs')).not.toBeInTheDocument();
  });

  it('shows a clear empty state when nothing matches', () => {
    renderTree('missing-method');

    expect(screen.getByText(/No collections or requests match/)).toHaveTextContent(
      'missing-method'
    );
  });
});
