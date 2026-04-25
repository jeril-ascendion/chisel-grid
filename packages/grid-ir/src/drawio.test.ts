import { describe, it, expect } from 'vitest';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { gridIRToDrawio } from './drawio';
import { DiagramType, type GridIR } from './types';

function build10NodeFixture(): GridIR {
  const types = [
    'aws.api_gateway',
    'aws.lambda',
    'aws.lambda',
    'aws.dynamodb',
    'aws.s3',
    'aws.sqs',
    'aws.sns',
    'aws.cloudfront',
    'aws.bedrock',
    'aws.cognito',
  ];
  return {
    version: '1.0',
    diagram_type: DiagramType.AWSArchitecture,
    title: 'Drawio fixture & friends',
    nodes: Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      type: types[i]!,
      label: `Cell ${i} <with> "quotes" & 'apos'`,
    })),
    edges: Array.from({ length: 9 }, (_, i) => ({
      id: `edge-${i}`,
      from: `node-${i}`,
      to: `node-${i + 1}`,
      type: 'invoke',
      label: `flow ${i}`,
    })),
  };
}

describe('gridIRToDrawio', () => {
  const ir = build10NodeFixture();
  const xml = gridIRToDrawio(ir);

  it('produces well-formed XML', () => {
    const result = XMLValidator.validate(xml);
    expect(result).toBe(true);
  });

  it('has the canonical mxfile/diagram/mxGraphModel/root structure', () => {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);
    expect(parsed.mxfile).toBeDefined();
    expect(parsed.mxfile.diagram).toBeDefined();
    expect(parsed.mxfile.diagram.mxGraphModel).toBeDefined();
    expect(parsed.mxfile.diagram.mxGraphModel.root).toBeDefined();
  });

  it('declares the structural cells id=0 and id=1 with the right parent', () => {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);
    const cells = parsed.mxfile.diagram.mxGraphModel.root.mxCell as Array<Record<string, string>>;
    const root0 = cells.find((c) => c['@_id'] === '0');
    const root1 = cells.find((c) => c['@_id'] === '1');
    expect(root0).toBeDefined();
    expect(root1).toBeDefined();
    expect(root1!['@_parent']).toBe('0');
  });

  it('emits 10 vertex cells and 9 edge cells', () => {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);
    const cells = parsed.mxfile.diagram.mxGraphModel.root.mxCell as Array<Record<string, string>>;
    const vertices = cells.filter((c) => c['@_vertex'] === '1');
    const edges = cells.filter((c) => c['@_edge'] === '1');
    expect(vertices).toHaveLength(10);
    expect(edges).toHaveLength(9);
  });

  it('uses AWS shape names from the mxgraph.aws4.* namespace', () => {
    expect(xml).toContain('shape=mxgraph.aws4.lambda');
    expect(xml).toContain('shape=mxgraph.aws4.api_gateway');
    expect(xml).toContain('shape=mxgraph.aws4.s3');
  });

  it('escapes special characters in labels and titles', () => {
    expect(xml).toContain('Cell 0 &lt;with&gt; &quot;quotes&quot; &amp; &apos;apos&apos;');
    expect(xml).toContain('Drawio fixture &amp; friends');
  });

  it('sets edge endpoints to source and target node ids', () => {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
    const parsed = parser.parse(xml);
    const cells = parsed.mxfile.diagram.mxGraphModel.root.mxCell as Array<Record<string, string>>;
    const firstEdge = cells.find((c) => c['@_id'] === 'edge-0');
    expect(firstEdge).toBeDefined();
    expect(firstEdge!['@_source']).toBe('node-0');
    expect(firstEdge!['@_target']).toBe('node-1');
  });

  it('drops edges whose endpoints are missing', () => {
    const broken: GridIR = {
      ...ir,
      edges: [
        ...ir.edges,
        { id: 'orphan', from: 'ghost', to: 'node-0' },
      ],
    };
    const out = gridIRToDrawio(broken);
    expect(out).not.toContain('id="orphan"');
  });
});
