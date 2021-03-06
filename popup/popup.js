$(document).ready(function() {
    console.log("Welcome to popup.js\nAll log messages (not errors!) will be printed to the background page's console.\nGoodbye!");
    var bg = chrome.extension.getBackgroundPage();
    window.console = bg.console;
    init();

    function init() {
        console.log("\npopup.js initializing...");

        // Set up status text
        var snoozedTabs = bg.getSnoozedTabs();
        var tabCount = snoozedTabs["tabCount"];
        if(tabCount > 0) {
            var button = $(document.createElement('button'));
            button.click(function() {
                console.log("status button clicked");
                window.open(chrome.extension.getURL("options/index.html#snoozed-tabs"));
            });

            $("#default-status").html(button);
            updateStatusText(snoozedTabs);
        }

        // Set up button click-handlers
        $("#snooze-buttons button").click(function() {
            var time = getTime($(this).attr("id"));
            snoozeCurrentTab(time);
        });

        $("#settings").click(function() {
            console.log("options clicked");
            window.open(chrome.extension.getURL("options/index.html#settings"));
        });

        // Set up listener for when snoozedTabs changes
        $(window).bind("storage", function(e) {
            updateStatusText(bg.getSnoozedTabs());
        });

        // Update badge text
        bg.updateBadgeText();
    }

    function updateStatusText(snoozedTabs) {
        var tabCount = snoozedTabs["tabCount"];

        if(tabCount > 0) {
            var buttonText = "" + tabCount + " Snoozed Tab";
            if(tabCount > 1) {
                buttonText += "s";
            }
            var button = $("#default-status button");
            button.text(buttonText);
        } else {
            $("#default-status").html("Tab Snooze");
        }
    }

    function snoozeCurrentTab(time) {
        if(!time) {
            return;
        }

        chrome.tabs.query({
            currentWindow: true,
            active: true
        }, function(tabs) {
            console.log("tabs: ", tabs);
            bg.snooze(tabs[0], time);
        });
    }

    function getTime(timeName) {
        console.log("timeName", timeName);
        console.log("now", new Date());

        var settings = bg.getSettings();

        // Get rounded time
        var roundedNow = new Date();
        roundedNow.setSeconds(0, 0); // Round date to minutes
        console.log("roundedNow", roundedNow);

        var second = 1000;
        var minute = second * 60;
        var hour = minute * 60;
        var day = hour * 24;

        var result = new Date();
        setSettingsTime(result, settings["start-day"]); // Default for most cases

        // Calculate wake-up time
        switch(timeName) {
            case "ten-seconds":
                result = new Date(Date.now() + 10 * second);
                break;
            case "later-today":
                result = new Date(roundedNow.getTime() + parseInt(settings["later-today"]) * hour);
                break;
            case "this-evening":
                setSettingsTime(result, settings["end-day"]);
                break;
            case "tomorrow-evening":
                result.setDate(result.getDate() + 1);
                setSettingsTime(result, settings["end-day"]);
                break;
            case "tomorrow":
                result.setDate(result.getDate() + 1); // Automatically updates months
                break;
            case "this-weekend":
                var daysToWeekend = daysToNextDay(result.getDay(), settings["weekend-begin"])
                result.setDate(result.getDate() + daysToWeekend);
                break;
            case "next-week":
                console.log("calculating next-week");
                var daysToWeek = daysToNextDay(result.getDay(), settings["week-begin"]);
                result.setDate(result.getDate() + daysToWeek);
                break;
            case "in-a-month":
                result.setMonth(result.getMonth() + 1);
                break;
            case "someday":
                result.setMonth(result.getMonth() + settings["someday"]);
                break;
            case "pick-date":
                bg.alert("Picking date is not yet available, sorry!");
                result = undefined;
                break;
            default:
                result = new Date();
        }

        console.log("result", result);
        return result;
    }

    function daysToNextDay(currentDay, nextDay) {
        if(currentDay > 6 || currentDay < 0 || nextDay > 6 || nextDay < 0) {
            return;
        }

        if(nextDay < currentDay) {
            return (7 + nextDay) - currentDay;
        } else {
            return nextDay - currentDay;
        }
    }

    function setSettingsTime(result, settingsTime) {
        var timeParts = settingsTime.split(/[\s:]+/);
        var hour = parseInt(timeParts[0]);
        var minute = parseInt(timeParts[1]);
        var meridian = timeParts[2];

        if(meridian == "AM" && hour == 12) {
            hour = 0;
        }

        if(meridian == "PM" && hour < 12) {
            hour = hour + 12;
        }

        result.setHours(hour, minute, 0, 0);
        return result;
    }
});

