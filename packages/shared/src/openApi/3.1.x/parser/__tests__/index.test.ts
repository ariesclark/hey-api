import { Logger } from '@hey-api/codegen-core';
import type { OpenAPIV3_1 } from '@hey-api/spec-types';

import { Context } from '../../../../ir/context';
import { parseV3_1_X } from '../index';

function createContext(spec: OpenAPIV3_1.Document) {
  return new Context({
    config: {
      input: [],
      logs: {},
      // @ts-expect-error
      output: {
        case: undefined,
        entryFile: false,
        path: '',
      },
      // @ts-expect-error - partial config for testing
      parser: {
        pagination: { keywords: [] },
        transforms: {
          enums: { case: 'PascalCase', enabled: false, mode: 'root', name: '{{name}}Enum' },
          propertiesRequiredByDefault: false,
          readWrite: {
            enabled: false,
            requests: { case: 'preserve', name: '{{name}}Writable' },
            responses: { case: 'preserve', name: '{{name}}' },
          },
        },
      },
      pluginOrder: [],
      plugins: {},
    },
    dependencies: {},
    logger: new Logger(),
    spec,
  });
}

describe('parseV3_1_X', () => {
  it('encodes $ref for schema name containing /', () => {
    const spec: OpenAPIV3_1.Document = {
      components: {
        schemas: {
          'node/type': {
            properties: {
              id: { type: 'string' },
            },
            type: 'object',
          },
        },
      },
      info: { title: 'Test', version: '1' },
      openapi: '3.1.0',
    };
    const context = createContext(spec);
    parseV3_1_X(context);
    expect(context.ir.components?.schemas?.['node/type']).toBeDefined();
  });

  it('encodes $ref for schema name containing ~', () => {
    const spec: OpenAPIV3_1.Document = {
      components: {
        schemas: {
          'type~special': {
            properties: {
              id: { type: 'string' },
            },
            type: 'object',
          },
        },
      },
      info: { title: 'Test', version: '1' },
      openapi: '3.1.0',
    };
    const context = createContext(spec);
    parseV3_1_X(context);
    expect(context.ir.components?.schemas?.['type~special']).toBeDefined();
  });

  it('encodes $ref for schema name containing / and ~', () => {
    const spec: OpenAPIV3_1.Document = {
      components: {
        schemas: {
          'node/type~special': {
            properties: {
              id: { type: 'string' },
            },
            type: 'object',
          },
        },
      },
      info: { title: 'Test', version: '1' },
      openapi: '3.1.0',
    };
    const context = createContext(spec);
    parseV3_1_X(context);
    expect(context.ir.components?.schemas?.['node/type~special']).toBeDefined();
  });

  it('encodes $ref for parameter name containing special characters', () => {
    const spec: OpenAPIV3_1.Document = {
      components: {
        parameters: {
          'param/special~name': {
            in: 'query' as const,
            name: 'special',
            schema: { type: 'string' },
          },
        },
      },
      info: { title: 'Test', version: '1' },
      openapi: '3.1.0',
    };
    const context = createContext(spec);
    parseV3_1_X(context);
    expect(context.ir.components?.parameters?.['param/special~name']).toBeDefined();
  });

  it('encodes $ref for requestBody name containing special characters', () => {
    const spec: OpenAPIV3_1.Document = {
      components: {
        requestBodies: {
          'body/special~name': {
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
      info: { title: 'Test', version: '1' },
      openapi: '3.1.0',
    };
    const context = createContext(spec);
    parseV3_1_X(context);
    expect(context.ir.components?.requestBodies?.['body/special~name']).toBeDefined();
  });

  describe('discriminator defaultMapping', () => {
    const pets = {
      Cat: {
        properties: { petType: { const: 'cat' } },
        required: ['petType'],
        type: 'object',
      },
      Dog: {
        properties: { petType: { const: 'dog' } },
        required: ['petType'],
        type: 'object',
      },
      OtherPet: {
        properties: { petType: { not: { enum: ['cat', 'dog'] }, type: 'string' } },
        type: 'object',
      },
    } satisfies Record<string, OpenAPIV3_1.SchemaObject>;

    const members = [
      { $ref: '#/components/schemas/Cat' },
      { $ref: '#/components/schemas/Dog' },
      { $ref: '#/components/schemas/OtherPet' },
    ];

    const mapping = {
      cat: '#/components/schemas/Cat',
      dog: '#/components/schemas/Dog',
    };

    it.each([
      { composition: 'oneOf', defaultMapping: '#/components/schemas/OtherPet' },
      { composition: 'anyOf', defaultMapping: '#/components/schemas/OtherPet' },
      { composition: 'oneOf', defaultMapping: 'OtherPet' },
    ])(
      'keeps defaultMapping $defaultMapping on a $composition union',
      ({ composition, defaultMapping }) => {
        const spec: OpenAPIV3_1.Document = {
          components: {
            schemas: {
              ...pets,
              Pet: {
                [composition]: members,
                discriminator: { defaultMapping, mapping, propertyName: 'petType' },
              },
            },
          },
          info: { title: 'Test', version: '1' },
          openapi: '3.1.0',
        };
        const context = createContext(spec);
        parseV3_1_X(context);
        expect(context.ir.components?.schemas?.Pet?.discriminator).toEqual({
          defaultMapping: '#/components/schemas/OtherPet',
          mapping,
          propertyName: 'petType',
        });
      },
    );

    it('leaves defaultMapping out when the discriminator has none', () => {
      const spec: OpenAPIV3_1.Document = {
        components: {
          schemas: {
            ...pets,
            Pet: {
              discriminator: { mapping, propertyName: 'petType' },
              oneOf: members.slice(0, 2),
            },
          },
        },
        info: { title: 'Test', version: '1' },
        openapi: '3.1.0',
      };
      const context = createContext(spec);
      parseV3_1_X(context);
      expect(context.ir.components?.schemas?.Pet?.discriminator).toEqual({
        mapping,
        propertyName: 'petType',
      });
    });
  });
});
