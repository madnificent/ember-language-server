import { preprocess, traverse, ASTv1 } from '@glimmer/syntax';
import { normalizeToClassicComponent, normalizeToNamedBlockName } from './normalizers';

function tokensFromType(node: any, scopedTokens: any) {
  const tokensMap = {
    PathExpression: (node: ASTv1.PathExpression) => {
      if (node.head.type === 'AtHead' || node.head.type === 'ThisHead') {
        return;
      }

      const possbleToken = node.head.name;

      if (!scopedTokens.includes(possbleToken)) {
        return possbleToken;
      }
    },
    ElementNode: ({ tag }: ASTv1.ElementNode) => {
      const char = tag.charAt(0);

      if (char !== char.toUpperCase() || char === ':') {
        return;
      }

      if (scopedTokens.includes(tag)) {
        return;
      }

      return tag;
    },
  };

  if (node.type in tokensMap) {
    return (tokensMap as any)[node.type](node);
  }
}

function addTokens(tokensSet: Set<string>, node: any, scopedTokens: any, nativeTokens: string[] = []) {
  const maybeTokens = tokensFromType(node, scopedTokens);

  (Array.isArray(maybeTokens) ? maybeTokens : [maybeTokens]).forEach((maybeToken: string) => {
    if (maybeToken !== undefined && !nativeTokens.includes(maybeToken) && !maybeToken.startsWith('@')) {
      tokensSet.add(maybeToken);
    }
  });
}

export function getTemplateBlocks(html: string): string[] {
  const ast = preprocess(html);
  const tokensSet: Set<string> = new Set();
  const defaultBlocks = ['inverse', 'else'];

  traverse(ast, {
    MustacheStatement: {
      enter(node: ASTv1.MustacheStatement) {
        const p = node.path;

        if (p && p.type === 'PathExpression' && p.original === 'yield' && p.head.type !== 'AtHead' && p.head.type !== 'ThisHead') {
          const to = node.hash.pairs.find((p) => {
            return p.key === 'to';
          });

          if (to && to.value && to.value.type === 'StringLiteral') {
            if (!defaultBlocks.includes(to.value.original)) {
              tokensSet.add(to.value.original);
            }
          }
        }
      },
    },
  });

  return Array.from(tokensSet).map((el) => normalizeToNamedBlockName(el));
}

function getTemplateTokens(html: string, nativeTokens: any) {
  const ast = preprocess(html);
  const tokensSet: Set<string> = new Set();
  const scopedTokens: string[] = [];

  traverse(ast, {
    Block: {
      enter({ blockParams }: ASTv1.Block) {
        blockParams.forEach((param) => {
          scopedTokens.push(param);
        });
      },
      exit({ blockParams }: ASTv1.Block) {
        blockParams.forEach(() => {
          scopedTokens.pop();
        });
      },
    },
    ElementNode: {
      enter(node: ASTv1.ElementNode) {
        node.blockParams.forEach((param) => {
          scopedTokens.push(param);
        });
        addTokens(tokensSet, node, scopedTokens);
      },
      exit({ blockParams }: ASTv1.ElementNode) {
        blockParams.forEach(() => {
          scopedTokens.pop();
        });
      },
    },
    All(node) {
      addTokens(tokensSet, node, scopedTokens, nativeTokens);
    },
  });

  return Array.from(tokensSet).map((el) => normalizeToClassicComponent(el));
}

export function extractTokensFromTemplate(template: string): string[] {
  if (template === '') {
    return [];
  }

  const ignored = ['if', 'yield', 'outlet', 'component', 'else', 'unless', 'let', 'each', 'each-in', 'in-element', 'on', 'fn', 'debugger', 'console'];

  return getTemplateTokens(template, ignored);
}
