import type { NodeData } from "../NodeData.js";
import type { INodeVisitor } from "../visitors/INodeVisitor.js";
import { BaseNode } from "./BaseNode.js";

export type TestRunner =
  | "jest"
  | "vitest"
  | "pytest"
  | "go_test"
  | "cargo_test"
  | "dotnet_test"
  | "custom";

/** Output format for test reports. */
export type TestReportFormat = "junit" | "tap" | "lcov" | "html" | "json";

/**
 * Type-specific parameters for a TestNode.
 * Stored inside `NodeData.params.baseParameters` at rest.
 */
export interface TestNodeParams {
  runner: TestRunner;
  /** Command override — used when runner === 'custom'. */
  command?: string;
  /** Glob pattern(s) selecting which test files to run. */
  testPattern?: string;
  /** Working directory relative to workspace root. */
  workingDirectory?: string;
  /** Minimum code coverage threshold (0-100). Fails step if not met. */
  coverageThreshold?: number;
  /** Where to write the test report file. */
  reportOutputPath?: string;
  reportFormat?: TestReportFormat;
  /** If true, a failing test does NOT mark the whole pipeline as failed. */
  continueOnError?: boolean;
}

/** Runs a test suite using the configured test runner. */
export class TestNode extends BaseNode {
  constructor(
    id: string,
    positionX: number,
    positionY: number,
    data: NodeData,
    public readonly testParams: TestNodeParams,
  ) {
    super(id, "test", positionX, positionY, data);
  }

  accept(visitor: INodeVisitor): void {
    visitor.visitTest(this);
  }
}
