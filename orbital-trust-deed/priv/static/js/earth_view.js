// ═══════════════════════════════════════════════════════════════
// ORBITAL TRUST DEED DASHBOARD Ω
// 3D Earth View — CesiumJS integration
// ═══════════════════════════════════════════════════════════════

const EarthView = {
  mounted() {
    this.initCesium();
  },

  updated() {
    this.updateSatellitePosition();
    this.updateLayer();
  },

  initCesium() {
    // Cesium Ion token — use your own or leave empty for limited access
    Cesium.Ion.defaultAccessToken = '';

    this.viewer = new Cesium.Viewer('earth-view', {
      imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: 'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg',
        layer: 'MODIS_Terra_CorrectedReflectance_TrueColor',
        style: '',
        tileMatrixSetID: '250m',
        maximumLevel: 8,
        format: 'jpg',
        credit: 'NASA GIBS'
      }),
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      animation: false,
      timeline: false,
      fullscreenButton: false,
      vrButton: false,
      selectionIndicator: false,
      infoBox: false,
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      contextOptions: {
        webgl: {
          alpha: true,
          antialias: true
        }
      },
      baseLayer: false
    });

    // Dark space background
    this.viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#0a0e17');
    this.viewer.scene.globe.enableLighting = false;

    // Add atmosphere
    this.viewer.scene.skyAtmosphere.show = true;

    // Add satellite marker
    this.satelliteEntity = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(0, 0, 400000),
      point: {
        pixelSize: 12,
        color: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.NONE
      },
      label: {
        text: 'SATELLITE',
        font: '12px monospace',
        fillColor: Cesium.Color.CYAN,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -20)
      }
    });

    // Add orbit path
    this.orbitPath = this.viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights([]),
        width: 2,
        material: new Cesium.PolylineGlowMaterialProperty({
          glowPower: 0.1,
          color: Cesium.Color.CYAN.withAlpha(0.5)
        })
      }
    });

    this.updateSatellitePosition();
  },

  updateSatellitePosition() {
    const lat = parseFloat(this.el.dataset.lat) || 0;
    const lon = parseFloat(this.el.dataset.lon) || 0;
    const alt = 408; // ISS altitude in km

    if (this.satelliteEntity) {
      this.satelliteEntity.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt * 1000);

      // Generate orbit path (simplified circular orbit)
      const positions = [];
      const orbitPoints = 360;
      for (let i = 0; i <= orbitPoints; i++) {
        const angle = (i / orbitPoints) * 2 * Math.PI;
        const orbitLon = lon + (i - orbitPoints / 2) * 0.5;
        const orbitLat = lat + Math.sin(angle) * 15;
        positions.push(Cesium.Cartesian3.fromDegrees(orbitLon, orbitLat, alt * 1000));
      }

      if (this.orbitPath) {
        this.orbitPath.polyline.positions = positions;
      }
    }
  },

  updateLayer() {
    const layer = this.el.dataset.layer;
    if (layer && this.viewer) {
      // Update GIBS layer
      const imageryLayers = this.viewer.imageryLayers;
      if (imageryLayers.length > 0) {
        imageryLayers.get(0).imageryProvider = new Cesium.UrlTemplateImageryProvider({
          url: `https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/${layer}/default/{Time}/{TileMatrixSet}/{TileMatrix}/{TileRow}/{TileCol}.jpg`,
          layer: layer,
          style: '',
          tileMatrixSetID: '250m',
          maximumLevel: 8,
          format: 'jpg',
          credit: 'NASA GIBS'
        });
      }
    }
  },

  destroyed() {
    if (this.viewer) {
      this.viewer.destroy();
    }
  }
};

// Export for Phoenix LiveView hooks
if (typeof window !== 'undefined') {
  window.EarthView = EarthView;
}
