import type { IR } from '../../../../ir/types';
import { buildDiscriminatedUnion } from '../discriminator';

describe('buildDiscriminatedUnion', () => {
  const definitions: Record<string, IR.SchemaObject> = {
    '#/components/schemas/Cat': {
      properties: { petType: { const: 'cat', type: 'string' } },
      required: ['petType'],
      type: 'object',
    },
    '#/components/schemas/Dog': {
      properties: { petType: { const: 'dog', type: 'string' } },
      required: ['petType'],
      type: 'object',
    },
    '#/components/schemas/OtherPet': {
      properties: { petType: { type: 'string' } },
      type: 'object',
    },
  };

  const resolveIrRef = (ref: string) => definitions[ref];

  const mapping = {
    cat: '#/components/schemas/Cat',
    dog: '#/components/schemas/Dog',
  };

  it('discriminates a union whose members are all mapped', () => {
    expect(
      buildDiscriminatedUnion({
        parentSchema: { discriminator: { mapping, propertyName: 'petType' } },
        resolveIrRef,
        schemas: [{ $ref: '#/components/schemas/Cat' }, { $ref: '#/components/schemas/Dog' }],
      }),
    ).toEqual({
      discriminatorKey: 'petType',
      members: [
        { discriminatedValue: 'cat', needsExtend: false, ref: '#/components/schemas/Cat' },
        { discriminatedValue: 'dog', needsExtend: false, ref: '#/components/schemas/Dog' },
      ],
    });
  });

  it('gives up on a union whose default mapping is one of its members', () => {
    expect(
      buildDiscriminatedUnion({
        parentSchema: {
          discriminator: {
            defaultMapping: '#/components/schemas/OtherPet',
            mapping,
            propertyName: 'petType',
          },
        },
        resolveIrRef,
        schemas: [
          { $ref: '#/components/schemas/Cat' },
          { $ref: '#/components/schemas/Dog' },
          { $ref: '#/components/schemas/OtherPet' },
        ],
      }),
    ).toBeNull();
  });
});
