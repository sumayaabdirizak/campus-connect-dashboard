$(document).ready(function () {

    $("#range_03").ionRangeSlider({
        type: "double",
        min: 0,
        max: 10000,
        from: 2000,
        to: 5000,
        prefix: "$",
        grid: false,
        onStart: updateRange,
        onChange: updateRange
    });

    function updateRange(data) {
        $("#range_value").text("$" + data.from + " - $" + data.to);
    }

});