function renderFrequencyTermsToolbarButton(shape, element) {
    const categoryTerm = shape.formatTermForDisplay(shape.properties.categoryTerm);
    const series = Array.isArray(shape.properties.series) ? shape.properties.series.filter(item => item?.term) : [];
    const firstSeriesName = series.length > 0 ? shape.formatTermForDisplay(String(series[0].term)) : "";
    const categoryPart = categoryTerm ? shape.createNameButtonTermMarkup(categoryTerm, shape.properties.categoryTerm) : "";
    const separator = categoryTerm && firstSeriesName ? `<i class="fa-light fa-chart-simple mdl-name-btn-separator"></i>` : "";
    const seriesPart = firstSeriesName ? shape.createNameButtonTermMarkup(firstSeriesName, series[0].term) : "";
    const extraCount = series.length - 1;
    const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
    if (!categoryPart && !seriesPart)
        element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
    else
        element.innerHTML = `${categoryPart}${separator}${seriesPart}${extraPart}`;
}
