/**
 * Nikon Darkroom Lab - WebGPU Acceleration Pipeline (WGSL)
 * Hardware-accelerated real-time negative inversion, 3D LUT film emulation, and grain synthesis
 */

import { InversionSettings } from '../../types/film';

const WGSL_SHADER_SOURCE = /* wgsl */ `
struct Uniforms {
  filmBase: vec3<f32>,
  filmType: u32, // 0 = color-neg, 1 = bw-neg, 2 = slide
  exposureEV: f32,
  density: f32,
  colorBalance: vec3<f32>, // cyanRed, magentaGreen, yellowBlue
  contrast: f32,
  saturation: f32,
  shadowLift: f32,
  highlightRecovery: f32,
  blackPoint: vec3<f32>,
  whitePoint: vec3<f32>,
  grainAmount: f32,
  grainSeed: f32,
  splitCompare: u32,
  splitPosition: f32,
  showClipping: u32,
};

@group(0) @binding(0) var uSampler: sampler;
@group(0) @binding(1) var uTexture: texture_2d<f32>;
@group(0) @binding(2) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 4>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0,  1.0)
  );

  var uvs = array<vec2<f32>, 4>(
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(0.0, 0.0),
    vec2<f32>(1.0, 0.0)
  );

  var output: VertexOutput;
  output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
  output.uv = uvs[vertexIndex];
  return output;
}

// Pseudo-random film grain hash generator
fn hash12(p: vec2<f32>) -> f32 {
  var p3 = fract(vec3<f32>(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let rawColor = textureSample(uTexture, uSampler, uv);
  
  // Split Before / After comparison
  if (u.splitCompare == 1u && uv.x > u.splitPosition) {
    // Show original negative with subtle split line
    if (abs(uv.x - u.splitPosition) < 0.002) {
      return vec4<f32>(1.0, 1.0, 1.0, 1.0);
    }
    return rawColor;
  }

  var r = rawColor.r;
  var g = rawColor.g;
  var b = rawColor.b;

  let baseR = max(0.01, u.filmBase.r);
  let baseG = max(0.01, u.filmBase.g);
  let baseB = max(0.01, u.filmBase.b);
  let expMult = pow(2.0, u.exposureEV);

  // Inversion math
  if (u.filmType == 0u) {
    // Color negative (C-41):
    // 1. Normalize each channel by orange film base rebate:
    // In raw negative scan: unexposed rebate is brightest (rNorm = 1.0)
    // Dense scene highlights have thick dye layers (rNorm << 1.0)
    let rNorm = clamp(r / baseR, 0.0, 1.0);
    let gNorm = clamp(g / baseG, 0.0, 1.0);
    let bNorm = clamp(b / baseB, 0.0, 1.0);

    // 2. Optical Transmission Inversion:
    // Rebate (1.0) -> maps to 0.0 (shadow / pure black film borders)
    // Dense highlight (0.05) -> maps to 0.95 (bright positive highlights)
    let invR = 1.0 - rNorm;
    let invG = 1.0 - gNorm;
    let invB = 1.0 - bNorm;

    // 3. Photographic paper density slope & channel gains
    let gamma = max(0.1, u.density);
    let rGain = max(0.0, 1.0 + (u.colorBalance.x / 100.0));
    let gGain = max(0.0, 1.0 + (u.colorBalance.y / 100.0));
    let bGain = max(0.0, 1.0 + (u.colorBalance.z / 100.0));

    r = pow(clamp(invR, 0.0, 1.0), gamma) * rGain * expMult;
    g = pow(clamp(invG, 0.0, 1.0), gamma) * gGain * expMult;
    b = pow(clamp(invB, 0.0, 1.0), gamma) * bGain * expMult;
  } else if (u.filmType == 1u) {
    // B&W Negative (Silver Halide)
    let luma = 0.299 * r + 0.587 * g + 0.114 * b;
    let lumaNorm = clamp(luma / baseG, 0.0, 1.0);
    let invLuma = pow(max(0.0, 1.0 - lumaNorm), u.density) * expMult;
    r = invLuma;
    g = invLuma;
    b = invLuma;
  } else {
    // Slide / Positive (E-6)
    let rGain = max(0.0, 1.0 + (u.colorBalance.x / 100.0));
    let gGain = max(0.0, 1.0 + (u.colorBalance.y / 100.0));
    let bGain = max(0.0, 1.0 + (u.colorBalance.z / 100.0));
    r = (r / baseR) * rGain * expMult;
    g = (g / baseG) * gGain * expMult;
    b = (b / baseB) * bGain * expMult;
  }

  // Black and White points
  r = (r - u.blackPoint.r) / max(0.01, u.whitePoint.r - u.blackPoint.r);
  g = (g - u.blackPoint.g) / max(0.01, u.whitePoint.g - u.blackPoint.g);
  b = (b - u.blackPoint.b) / max(0.01, u.whitePoint.b - u.blackPoint.b);

  // Shadow lift and Highlight recovery
  let luma = 0.299 * r + 0.587 * g + 0.114 * b;
  if (u.shadowLift != 0.0) {
    let shadowMask = max(0.0, 1.0 - luma * 2.0);
    let lift = (u.shadowLift / 100.0) * 0.25 * shadowMask;
    r += lift;
    g += lift;
    b += lift;
  }

  if (u.highlightRecovery != 0.0) {
    let hlMask = max(0.0, (luma - 0.7) / 0.3);
    let recovery = (u.highlightRecovery / 100.0) * 0.25 * hlMask;
    r -= recovery;
    g -= recovery;
    b -= recovery;
  }

  // Contrast
  let contrastMult = (u.contrast + 100.0) / 100.0;
  r = (r - 0.5) * contrastMult + 0.5;
  g = (g - 0.5) * contrastMult + 0.5;
  b = (b - 0.5) * contrastMult + 0.5;

  // Saturation
  if (u.filmType != 1u) {
    let satMult = (u.saturation + 100.0) / 100.0;
    let finalLuma = 0.299 * r + 0.587 * g + 0.114 * b;
    r = finalLuma + (r - finalLuma) * satMult;
    g = finalLuma + (g - finalLuma) * satMult;
    b = finalLuma + (b - finalLuma) * satMult;
  }

  // Grain simulation
  if (u.grainAmount > 0.0) {
    let grainNoise = (hash12(uv * 1024.0 + vec2<f32>(u.grainSeed, u.grainSeed * 1.5)) - 0.5) * (u.grainAmount / 100.0) * 0.25;
    r += grainNoise;
    g += grainNoise;
    b += grainNoise;
  }

  // Over/under exposure clipping warning overlay
  if (u.showClipping == 1u) {
    if (r > 0.99 && g > 0.99 && b > 0.99) {
      return vec4<f32>(1.0, 0.0, 0.0, 1.0); // Red highlight blow out
    }
    if (r < 0.01 && g < 0.01 && b < 0.01) {
      return vec4<f32>(0.0, 0.2, 1.0, 1.0); // Blue shadow crush
    }
  }

  return vec4<f32>(clamp(r, 0.0, 1.0), clamp(g, 0.0, 1.0), clamp(b, 0.0, 1.0), 1.0);
}
`;

export class WebGPUPipeline {
  private adapter: GPUAdapter | null = null;
  private device: GPUDevice | null = null;
  private pipeline: GPURenderPipeline | null = null;
  private sampler: GPUSampler | null = null;
  private uniformBuffer: GPUBuffer | null = null;
  private currentTexture: GPUTexture | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private canvasContext: GPUCanvasContext | null = null;

  public isAvailable: boolean = false;
  public adapterName: string = 'Detecting hardware...';
  public initError: string | null = null;

  public async init(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      if (!('gpu' in navigator)) {
        this.initError = 'WebGPU not supported by this browser. Falling back to WebAssembly SIMD engine.';
        this.adapterName = 'WebAssembly SIMD Engine';
        return false;
      }

      const gpu = (navigator as unknown as { gpu: GPU }).gpu;
      this.adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!this.adapter) {
        this.initError = 'No compatible WebGPU hardware adapter found.';
        this.adapterName = 'WebAssembly Fallback';
        return false;
      }

      this.adapterName = (this.adapter as unknown as { info?: { architecture?: string; vendor?: string; description?: string } }).info?.description 
        || 'Hardware GPU Adapter';

      this.device = await this.adapter.requestDevice();
      this.canvasContext = canvas.getContext('webgpu') as GPUCanvasContext | null;

      if (!this.canvasContext) {
        this.initError = 'Could not acquire WebGPU context.';
        return false;
      }

      const format = gpu.getPreferredCanvasFormat();
      this.canvasContext.configure({
        device: this.device,
        format: format,
        alphaMode: 'opaque'
      });

      const shaderModule = this.device.createShaderModule({
        code: WGSL_SHADER_SOURCE
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main'
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{ format: format }]
        },
        primitive: {
          topology: 'triangle-strip',
          stripIndexFormat: undefined
        }
      });

      this.sampler = this.device.createSampler({
        magFilter: 'linear',
        minFilter: 'linear'
      });

      // Allocate uniform buffer (128 bytes aligned)
      // GPUBufferUsage.UNIFORM (0x0040) | GPUBufferUsage.COPY_DST (0x0008)
      this.uniformBuffer = this.device.createBuffer({
        size: 128,
        usage: 0x0040 | 0x0008
      });

      this.isAvailable = true;
      return true;
    } catch (err) {
      this.initError = (err as Error).message;
      this.isAvailable = false;
      this.adapterName = 'WebAssembly SIMD Fallback';
      return false;
    }
  }

  /**
   * Upload image pixels to WebGPU texture
   */
  public uploadSourceImage(imageData: ImageData): void {
    if (!this.device || !this.pipeline || !this.sampler || !this.uniformBuffer) return;

    if (this.currentTexture) {
      this.currentTexture.destroy();
    }

    // GPUTextureUsage.TEXTURE_BINDING (0x04) | GPUTextureUsage.COPY_DST (0x02) | GPUTextureUsage.RENDER_ATTACHMENT (0x10)
    this.currentTexture = this.device.createTexture({
      size: [imageData.width, imageData.height, 1],
      format: 'rgba8unorm',
      usage: 0x04 | 0x02 | 0x10
    });

    this.device.queue.writeTexture(
      { texture: this.currentTexture },
      imageData.data.buffer,
      { bytesPerRow: imageData.width * 4 },
      [imageData.width, imageData.height, 1]
    );

    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: this.sampler },
        { binding: 1, resource: this.currentTexture.createView() },
        { binding: 2, resource: { buffer: this.uniformBuffer } }
      ]
    });
  }

  /**
   * Render frame using WGSL shaders
   */
  public render(settings: InversionSettings): void {
    if (!this.device || !this.pipeline || !this.bindGroup || !this.canvasContext || !this.uniformBuffer) {
      return;
    }

    // Pack uniforms into Float32/Uint32 buffer
    const uniformData = new ArrayBuffer(128);
    const f32 = new Float32Array(uniformData);
    const u32 = new Uint32Array(uniformData);

    // vec3 filmBase (offset 0, 1, 2)
    f32[0] = settings.filmBase.r;
    f32[1] = settings.filmBase.g;
    f32[2] = settings.filmBase.b;

    // u32 filmType (offset 3)
    u32[3] = settings.filmType === 'color-negative' ? 0 : settings.filmType === 'bw-negative' ? 1 : 2;

    // f32 exposureEV, density (offset 4, 5)
    f32[4] = settings.exposureEV;
    f32[5] = settings.density;

    // f32 padding (offset 6, 7)
    // vec3 colorBalance (offset 8, 9, 10)
    f32[8] = settings.cyanRed;
    f32[9] = settings.magentaGreen;
    f32[10] = settings.yellowBlue;

    // f32 contrast (offset 11)
    f32[11] = settings.contrast;

    // f32 saturation, shadowLift, highlightRecovery (offset 12, 13, 14)
    f32[12] = settings.saturation;
    f32[13] = settings.shadowLift;
    f32[14] = settings.highlightRecovery;

    // vec3 blackPoint (offset 16, 17, 18)
    f32[16] = settings.blackPoint.r;
    f32[17] = settings.blackPoint.g;
    f32[18] = settings.blackPoint.b;

    // vec3 whitePoint (offset 20, 21, 22)
    f32[20] = settings.whitePoint.r;
    f32[21] = settings.whitePoint.g;
    f32[22] = settings.whitePoint.b;

    // grain, seed, splitCompare, splitPosition, showClipping (offset 24, 25, 26, 27, 28)
    f32[24] = settings.grainAmount;
    f32[25] = Math.random();
    u32[26] = settings.splitCompare ? 1 : 0;
    f32[27] = settings.splitPosition / 100.0;
    u32[28] = settings.showClipping ? 1 : 0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);

    const commandEncoder = this.device.createCommandEncoder();
    const textureView = this.canvasContext.getCurrentTexture().createView();

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.05, g: 0.05, b: 0.07, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }
      ]
    });

    renderPass.setPipeline(this.pipeline);
    renderPass.setBindGroup(0, this.bindGroup);
    renderPass.draw(4);
    renderPass.end();

    this.device.queue.submit([commandEncoder.finish()]);
  }
}

export const webgpuPipeline = new WebGPUPipeline();
