/**
 * Machine Learning Algorithms implemented in TypeScript
 */

// --- 1. Matrix Mathematics Utilities ---

export function transpose(matrix: number[][]): number[][] {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const result: number[][] = [];
  for (let c = 0; c < cols; c++) {
    result[c] = [];
    for (let r = 0; r < rows; r++) {
      result[c][r] = matrix[r][c];
    }
  }
  return result;
}

export function multiply(A: number[][], B: number[][]): number[][] {
  const rA = A.length;
  const cA = A[0].length;
  const cB = B[0].length;
  const result: number[][] = [];
  for (let r = 0; r < rA; r++) {
    result[r] = [];
    for (let c = 0; c < cB; c++) {
      let sum = 0;
      for (let k = 0; k < cA; k++) {
        sum += A[r][k] * B[k][c];
      }
      result[r][c] = sum;
    }
  }
  return result;
}

// Solves A * x = B using Gaussian Elimination with partial pivoting
export function solveLU(A: number[][], B: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, B[i]]);

  for (let i = 0; i < n; i++) {
    // Search for maximum in this column
    let maxEl = Math.abs(M[i][i]);
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > maxEl) {
        maxEl = Math.abs(M[k][i]);
        maxRow = k;
      }
    }

    // Swap maximum row with current row
    const temp = M[maxRow];
    M[maxRow] = M[i];
    M[i] = temp;

    // Make all rows below this one 0 in current column
    for (let k = i + 1; k < n; k++) {
      const c = -M[k][i] / (M[i][i] || 1e-9);
      for (let j = i; j <= n; j++) {
        if (i === j) {
          M[k][j] = 0;
        } else {
          M[k][j] += c * M[i][j];
        }
      }
    }
  }

  // Solve equation Ax=B for an upper triangular matrix M
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n] / (M[i][i] || 1e-9);
    for (let k = i - 1; k >= 0; k--) {
      M[k][n] -= M[k][i] * x[i];
    }
  }
  return x;
}

// Fits a multiple linear regression: Y = X * beta
export function solveLinearRegression(X: number[][], Y: number[]): number[] {
  const Xt = transpose(X);
  const XtX = multiply(Xt, X);
  const XtY: number[] = [];
  const rXt = Xt.length;
  const cXt = Xt[0].length;
  
  for (let r = 0; r < rXt; r++) {
    let sum = 0;
    for (let c = 0; c < cXt; c++) {
      sum += Xt[r][c] * Y[c];
    }
    XtY[r] = sum;
  }
  
  return solveLU(XtX, XtY);
}


// --- 2. Decision Tree Regressor ---

interface TreeNode {
  featureIdx?: number;
  threshold?: number;
  value?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export class DecisionTreeRegressor {
  private root: TreeNode | null = null;
  private maxDepth: number;
  public featureMapping?: number[];

  constructor(maxDepth = 3) {
    this.maxDepth = maxDepth;
  }

  public fit(X: number[][], Y: number[]): void {
    this.root = this.buildTree(X, Y, 0);
  }

  public predict(x: number[]): number {
    if (!this.root) return 0;
    return this.traverseTree(this.root, x);
  }

  private buildTree(X: number[][], Y: number[], depth: number): TreeNode {
    const numSamples = X.length;
    
    // Base cases: max depth reached, or 1 sample left, or variance is zero
    if (depth >= this.maxDepth || numSamples <= 2) {
      return { value: this.mean(Y) };
    }

    const numFeatures = X[0].length;
    let bestVarianceReduction = -1;
    let bestFeatureIdx = -1;
    let bestThreshold = -1;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const parentVariance = this.variance(Y);

    for (let f = 0; f < numFeatures; f++) {
      // Collect unique feature values as split candidates
      const values = X.map(row => row[f]);
      const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);
      
      for (let i = 0; i < uniqueValues.length - 1; i++) {
        // Threshold is midpoint
        const threshold = (uniqueValues[i] + uniqueValues[i + 1]) / 2;
        
        const leftIndices: number[] = [];
        const rightIndices: number[] = [];
        
        for (let s = 0; s < numSamples; s++) {
          if (X[s][f] <= threshold) {
            leftIndices.push(s);
          } else {
            rightIndices.push(s);
          }
        }

        if (leftIndices.length === 0 || rightIndices.length === 0) continue;

        const leftY = leftIndices.map(idx => Y[idx]);
        const rightY = rightIndices.map(idx => Y[idx]);

        const splitVariance = 
          (leftY.length / numSamples) * this.variance(leftY) +
          (rightY.length / numSamples) * this.variance(rightY);

        const varianceReduction = parentVariance - splitVariance;

        if (varianceReduction > bestVarianceReduction) {
          bestVarianceReduction = varianceReduction;
          bestFeatureIdx = f;
          bestThreshold = threshold;
          bestLeftIndices = leftIndices;
          bestRightIndices = rightIndices;
        }
      }
    }

    if (bestFeatureIdx === -1 || bestVarianceReduction <= 1e-6) {
      return { value: this.mean(Y) };
    }

    const leftX = bestLeftIndices.map(idx => X[idx]);
    const leftY = bestLeftIndices.map(idx => Y[idx]);
    const rightX = bestRightIndices.map(idx => X[idx]);
    const rightY = bestRightIndices.map(idx => Y[idx]);

    return {
      featureIdx: bestFeatureIdx,
      threshold: bestThreshold,
      left: this.buildTree(leftX, leftY, depth + 1),
      right: this.buildTree(rightX, rightY, depth + 1)
    };
  }

  private traverseTree(node: TreeNode, x: number[]): number {
    if (node.value !== undefined) {
      return node.value;
    }
    if (node.featureIdx !== undefined && node.threshold !== undefined && node.left && node.right) {
      if (x[node.featureIdx] <= node.threshold) {
        return this.traverseTree(node.left, x);
      } else {
        return this.traverseTree(node.right, x);
      }
    }
    return 0;
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  private variance(arr: number[]): number {
    if (arr.length <= 1) return 0;
    const avg = this.mean(arr);
    return arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  }
}


// --- 3. Random Forest Regressor ---

export class RandomForestRegressor {
  private trees: DecisionTreeRegressor[] = [];
  private numTrees: number;
  private maxDepth: number;

  constructor(numTrees = 10, maxDepth = 4) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
  }

  public fit(X: number[][], Y: number[]): void {
    this.trees = [];
    const numSamples = X.length;
    const numFeatures = X[0].length;
    
    // Feature bagging limit: sqrt(features) or at least 4
    const maxSubFeatures = Math.max(4, Math.floor(Math.sqrt(numFeatures)));

    for (let t = 0; t < this.numTrees; t++) {
      // 1. Bootstrap sampling (with replacement)
      const bootX: number[][] = [];
      const bootY: number[] = [];
      for (let i = 0; i < numSamples; i++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        bootX.push(X[randIdx]);
        bootY.push(Y[randIdx]);
      }

      // 2. Select a subset of features for each split (simulated inside tree, or pre-projected)
      // Here we will project X to a subset of randomly selected features for this tree
      const featureSubset: number[] = [];
      while (featureSubset.length < maxSubFeatures) {
        const f = Math.floor(Math.random() * numFeatures);
        if (!featureSubset.includes(f)) {
          featureSubset.push(f);
        }
      }

      const projX = bootX.map(row => featureSubset.map(idx => row[idx]));
      
      const tree = new DecisionTreeRegressor(this.maxDepth);
      tree.fit(projX, bootY);
      
      // Store tree along with its feature mapping
      tree.featureMapping = featureSubset;
      this.trees.push(tree);
    }
  }

  public predict(x: number[]): number {
    if (this.trees.length === 0) return 0;
    let sum = 0;
    for (const tree of this.trees) {
      const projX = (tree.featureMapping || []).map((idx: number) => x[idx]);
      sum += tree.predict(projX);
    }
    return sum / this.trees.length;
  }
}


// --- 4. XGBoost Regressor (Simplified GBDT) ---

export class XGBoostRegressor {
  private trees: DecisionTreeRegressor[] = [];
  private numTrees: number;
  private maxDepth: number;
  private learningRate: number;
  private basePrediction = 0;

  constructor(numTrees = 10, maxDepth = 3, learningRate = 0.1) {
    this.numTrees = numTrees;
    this.maxDepth = maxDepth;
    this.learningRate = learningRate;
  }

  public fit(X: number[][], Y: number[]): void {
    this.trees = [];
    const numSamples = X.length;
    
    // XGBoost base prediction (mean of targets)
    this.basePrediction = Y.reduce((s, v) => s + v, 0) / numSamples;
    
    const predictions = new Array(numSamples).fill(this.basePrediction);

    for (let t = 0; t < this.numTrees; t++) {
      // Calculate current residuals (gradient of MSE loss is actual - predicted)
      const currentResiduals = Y.map((y, idx) => y - predictions[idx]);
      
      const tree = new DecisionTreeRegressor(this.maxDepth);
      tree.fit(X, currentResiduals);
      
      // Update predictions: pred = pred + learningRate * tree_prediction
      for (let s = 0; s < numSamples; s++) {
        predictions[s] += this.learningRate * tree.predict(X[s]);
      }
      
      this.trees.push(tree);
    }
  }

  public predict(x: number[]): number {
    let prediction = this.basePrediction;
    for (const tree of this.trees) {
      prediction += this.learningRate * tree.predict(x);
    }
    return prediction;
  }
}


// --- 5. Prophet-like Additive Model ---

export class ProphetRegressor {
  private coefficients: number[] = [];
  private meanX: number[] = [];
  private stdX: number[] = [];

  public fit(X: number[][], Y: number[]): void {
    const numSamples = X.length;
    const numFeatures = X[0].length;

    // Feature normalization (StandardScaler) for stability in least-squares solution
    this.meanX = [];
    this.stdX = [];
    const normX: number[][] = [];

    for (let f = 0; f < numFeatures; f++) {
      const vals = X.map(row => row[f]);
      const mean = vals.reduce((s, v) => s + v, 0) / numSamples;
      const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / numSamples;
      const std = Math.sqrt(variance) || 1.0;
      
      this.meanX.push(mean);
      this.stdX.push(std);
    }

    for (let s = 0; s < numSamples; s++) {
      normX[s] = [];
      for (let f = 0; f < numFeatures; f++) {
        normX[s][f] = (X[s][f] - this.meanX[f]) / this.stdX[f];
      }
      // Add intercept term at the end
      normX[s].push(1.0);
    }

    this.coefficients = solveLinearRegression(normX, Y);
  }

  public predict(x: number[]): number {
    if (this.coefficients.length === 0) return 0;
    
    // Normalize input
    const normX: number[] = [];
    for (let f = 0; f < x.length; f++) {
      normX[f] = (x[f] - this.meanX[f]) / this.stdX[f];
    }
    normX.push(1.0); // Intercept

    let prediction = 0;
    for (let f = 0; f < normX.length; f++) {
      prediction += normX[f] * this.coefficients[f];
    }
    
    return prediction;
  }

  public getCoefficients(): number[] {
    return this.coefficients;
  }
}
