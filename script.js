const map = L.map('map').setView([20, 0], 2);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

const geojsonUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

let countryStats = {};
const nameMap = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'Democratic Republic of the Congo',
  'Republic of Congo': 'Republic of the Congo',
  'W. Sahara': 'Western Sahara',
  'Dominican Rep.': 'Dominican Republic',
  'Falkland Is.': 'Falkland Islands',
  'Timor-Leste': 'East Timor',
  'Central African Rep.': 'Central African Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'eSwatini': 'Swaziland',
  'Solomon Is.': 'Solomon Islands',
  'Bosnia and Herz.': 'Bosnia-Herzegovina',
  'North Macedonia': 'Macedonia',
  'S. Sudan': 'South Sudan',
  'N. Cyprus': 'Cyprus',
  'Somaliland': 'Somalia',
  "Côte d'Ivoire": 'Ivory Coast',
  'Czechia': 'Czech Republic',
  'Slovakia': 'Slovak Republic',
  'Palestine': 'West Bank and Gaza Strip'
};

// Color scale — uses log scale since a handful of countries (Afghanistan, Iraq)
// have tens of thousands of attacks while most have under a hundred.
// A plain linear scale would make almost every country look the same pale color.
function getColor(attacks) {
  if (!attacks || attacks === 0) return '#e0e0e0';
  const scaled = Math.log(attacks + 1);
  if (scaled > 9) return '#67000d';
  if (scaled > 7.5) return '#a50f15';
  if (scaled > 6) return '#de2d26';
  if (scaled > 4.5) return '#fb6a4a';
  if (scaled > 3) return '#fcae91';
  return '#fee5d9';
}

fetch('country_stats.json')
  .then(response => response.json())
  .then(data => {
    countryStats = data;
    let sumAttacks = 0, countWithData = 0;
Object.values(data).forEach(c => {
  sumAttacks += c.total_attacks;
  if (c.total_attacks > 0) countWithData++;
});
document.getElementById('stat-total').textContent = sumAttacks.toLocaleString();
document.getElementById('stat-countries').textContent = countWithData;
    loadMap();
  });

function loadMap() {
  fetch(geojsonUrl)
    .then(response => response.json())
    .then(data => {
      const geoLayer = L.geoJSON(data, {
        style: function (feature) {
          const rawName = feature.properties.NAME;
          const countryName = nameMap[rawName] || rawName;
          const stats = countryStats[countryName];
          return {
            fillColor: getColor(stats ? stats.total_attacks : 0),
            fillOpacity: 0.75,
            color: '#ffffff',
            weight: 1
          };
        },
        onEachFeature: function (feature, layer) {
          const rawName = feature.properties.NAME;
          const countryName = nameMap[rawName] || rawName;
          const stats = countryStats[countryName];

          layer.on('mouseover', function () {
            layer.setStyle({ weight: 3, color: '#333' });
            layer.bringToFront();
            if (layer._path) {
              layer._path.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.9))';
            }
          });
          layer.on('mouseout', function () {
            geoLayer.resetStyle(layer);
            if (layer._path) {
              layer._path.style.filter = '';
            }
          });
          layer.on('click', function () {
            let popupHtml;
            if (stats) {
              const yearsList = (stats.peak_years || [])
                .map(y => '<div>' + y.year + ': ' + y.attacks.toLocaleString() + ' attacks</div>')
                .join('');
              const groupsList = (stats.top_groups || [])
                .map(g => '<div>' + g.group + ' (' + g.count.toLocaleString() + ' attacks)</div>')
                .join('');
              popupHtml =
                '<div style="font-family: sans-serif; min-width: 200px;">' +
                '<h3 style="margin: 0 0 6px;">' + countryName + '</h3>' +
                '<p style="margin: 0 0 6px;"><strong>' + stats.total_attacks.toLocaleString() + '</strong> total attacks</p>' +
                '<p style="margin: 0 0 2px; font-weight: bold;">Most active groups:</p>' +
                groupsList +
                '<p style="margin: 8px 0 2px; font-weight: bold;">Deadliest group (by lives lost):</p>' +
                '<div>' + stats.deadliest_group + ' (' + stats.deadliest_group_killed.toLocaleString() + ' killed)</div>' +
                '<p style="margin: 8px 0 2px; font-weight: bold;">Peak years (highest attack counts):</p>' +
                yearsList +
                '<p style="margin: 8px 0 0; font-size: 0.9em; color: #555;">Most recent year on record: ' +
                stats.latest_year + ' (' + stats.latest_year_attacks + ' attacks)</p>' +
                '</div>';
            } else {
              popupHtml = '<strong>' + countryName + '</strong><br>No data available for this country.';
            }
            layer.bindPopup(popupHtml).openPopup();
          });
        }
      }).addTo(map);
    });
}
