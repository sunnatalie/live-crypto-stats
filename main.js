$(document).ready(function(){

    const loader = 
        `<div id="loader" class="loader">
            <div class="loading-spinner"></div>
        </div>`;

    const selectors = {
        mainContainer: "#main",
        homeSection: "#homeSection",
        reportSection: "#reportSection",
        aboutSection: "#aboutSection",
        loader: "#loader",
        loaderContainer: ".loaderContainer"
    };

    const MORE_INFO_LOCAL_STORAGE_KEY = "more_info";
    const COINS_CHOSEN_ARRAY_KEY = "coins_chosen_array"
    const TWO_MINUTES = 120000;
    const TWO_SECONDS = 2000;
    const COINS_API_URL = "https://api.coingecko.com/api/v3/coins/";
    let coins = [];
    const moreInfoTimers = {};
    let coinsChosenArray = [];
    let prices = [];
    let newData = new Map();
    let intervalID;

    // loads home section when you first enter website
    init();

    // loads sections when moving between report section, about section, and home
    $("a").on("click",function(){
        $("section").remove();
        const dataSection = $(this).attr("data-section");

        const selector = `#${dataSection}`;

        switch(selector){
            case selectors.reportSection:
                console.log("reportSection");
                liveReportSection()
                break;
            case selectors.aboutSection:
                console.log("aboutSection");
                aboutSection()
                break;
            default:
                console.log("home");
                init();
                break;
        }
    })

    // loads more info content and calls API again if more than two minutes have passed
    $("#main").on("click", "#homeSection > .card > button.more-info", async function (e) {
        let coin;
        const coinID = $(this).attr("data-coin-id");
        const currentCard = $(`#${coinID}`);
        const currentLoaderContainer = $(currentCard).find(selectors.loaderContainer);
        const now = new Date();
        const timer = moreInfoTimers[coinID];
         
        const timeDiff = timer ? now - timer : TWO_MINUTES;
        
        if(timeDiff < TWO_MINUTES){
            const coinsHash = getCoinFromLocalStorage();
            
            coin = coinsHash[coinID];

            console.log('less than two minutes')
        } else {
            $(loader).appendTo(currentLoaderContainer);
            $(currentLoaderContainer).show();
            
            coin = await getMoreInfo(coinID);
            
            $(selectors.loader).remove();
            $(currentLoaderContainer).hide();
            
            const coinsHash = getCoinFromLocalStorage();
            
            coinsHash[coinID] = coin;
            
            localStorage.setItem(MORE_INFO_LOCAL_STORAGE_KEY, JSON.stringify(coinsHash));
            moreInfoTimers[coinID] = new Date();
            
        }

        const content = `
        <br>
        💲 ${coin.market_data.current_price.usd} <br>
        💶 ${coin.market_data.current_price.eur} <br>
        🎼 ${coin.market_data.current_price.ils}
        `;
        $(this).next().html(content);

        // toggles the "more info" content
        var clicks = $(e.target).data('clicks');
        if (clicks) {
           console.log('even click');
           $(e.target).next().html(content).empty();
        } else {
           console.log('odd click');
        }
        $(this).data("clicks", !clicks);
    });

    async function getMoreInfo(coinID){
        const coin = await getJSON(`${COINS_API_URL}/${coinID}`)
        return coin;
    }

    function getCoinFromLocalStorage(){
        const coin = localStorage.getItem(MORE_INFO_LOCAL_STORAGE_KEY);
        return coin ? JSON.parse(coin) : {};
    }

    $("header").on("keyup", "input[type=search]", function () {
        const textToSearch = $(this).val().toLowerCase();
        if (textToSearch === "") {
            console.log('clear');
            displayCoins(coins);
        } else {
            const filteredCoins = coins.filter(
                (c) => c.symbol.indexOf(textToSearch) >= 0
                );
                if (filteredCoins.length > 0) {
                    displayCoins(filteredCoins);
                }
            }
        });

    // resets search box after clicking "x"
    $("#searchBox").on("search", () => displayCoins(coins));
        
    async function handleCoins(){
        try{
            $(loader).appendTo(selectors.mainContainer);
            coins = await getJSON(COINS_API_URL);
            displayCoins(coins);
        } catch (err) {
            alert(err.message);
        } finally {
            $(selectors.loader).remove();
        }
    }
        
    function displayCoins(coins){
            
        let content = '';
            
        for(const coin of coins){
            const card = createCard(coin);
            content += card;
        }
            
        $("#homeSection").html(content);
    }
        
    function createCard(coin){
        const {
            id,
            symbol,
            name,
            image: {thumb},
        } = coin;
    
        const card = `
            <div class="card col-8 col-md-5 col-lg-4 col-xl-2 m-3 p-4" id="${id}">
                <div class="heading d-flex justify-content-between">
                    <img src="${thumb}" class="coin-image pb-2">
                    <div class="form-check form-switch">
                        <input class="form-check-input color-dark" type="checkbox" role="switch" id="flexSwitchCheckDefault">
                    </div>
                </div>
                <br>
                <h5 class="card-title coin-name">${name}</h5>
                <span class="coin-symbol" id="${symbol}">${symbol}</span><br>
                <button class="button more-info btn btn-outline-primary" data-coin-id="${id}">more info</button>
                <span></span>
                <div class="loaderContainer m-3"></div>
            </div>`;
        return card;
    }

    // loads the checked, unchecked, and setting of the switch toggles when moving between page sections
    async function loadChosenCoinsToggle(){

        await handleCoins();

        // checked or unchecked setting
        for(i = 0; i < coins.length; i++){
            let card = $(`#${coins[i].id}`);
            let checkboxSetting = localStorage.getItem(coins[i].symbol.toUpperCase());
            if(checkboxSetting){
                    $(card).find("input").attr('checked',true);
            }
        }

        // disabled setting
        let coinsChosenArray = JSON.parse(localStorage.getItem(COINS_CHOSEN_ARRAY_KEY));
        if(coinsChosenArray.length >= 5){
            for(i = 0; i < coins.length; i++){
                let card = $(`#${coins[i].id}`).get();
                if(!coinsChosenArray.includes(coins[i].symbol.toUpperCase())){
                    $(card).find("input").attr('disabled',true);
                }
            }
        }
    }
    
    // saves switch toggle settings to local storage and enables the disabled setting, fired by the click event
    $("#main").on("click","#homeSection > .card > .heading > .form-switch > .form-check-input", function(e){

        const currentCheckbox = $(e.target).get();

        const currentId = $(currentCheckbox).parent().parent().next().next().next().attr('id').toUpperCase();
        
        // adds checked coins to array and adds checkbox setting to local storage
        if($(currentCheckbox).is(':checked')) {
            console.log("checked");
            coinsChosenArray.push(currentId);
            console.log(coinsChosenArray);
            localStorage.setItem(currentId,true);
            localStorage.setItem(COINS_CHOSEN_ARRAY_KEY,JSON.stringify(coinsChosenArray));
        }

        //removes unchecked coins from array and removes checkbox setting from local storage
        if(!$(currentCheckbox).is(':checked')){
            console.log("unchecked");
            localStorage.removeItem(currentId,true);
            const index = coinsChosenArray.indexOf(currentId);
            if (index > -1){
                coinsChosenArray.splice(index,1);
                console.log(coinsChosenArray);
            }
            localStorage.setItem(COINS_CHOSEN_ARRAY_KEY,JSON.stringify(coinsChosenArray));
        }

        // removes all disabled attributes if the number of coins chosen is under 5
        if(coinsChosenArray.length < 5){
            for(i = 0; i < coins.length; i++){
                let card = $(`#${coins[i].id}`).get();
                $(card).find("input").removeAttr('disabled');
            }
        }

        // adds disabled attributes to anything that is not checked, if the array is longer or equal to 5
        if(coinsChosenArray.length >= 5){
            for(i = 0; i < coins.length; i++){
                let card = $(`#${coins[i].id}`).get();
                if(!coinsChosenArray.includes(coins[i].symbol.toUpperCase())){
                    $(card).find("input").attr('disabled',true);
                }
            }
        }

    });
        
    function getJSON(url){
        return new Promise((resolve,reject) => {
            setTimeout(() => {
                $.ajax({
                    url,
                    success: (data) => {
                        resolve(data);
                    },
                    error: (err) => {
                        reject(err);
                    },
                });
            }, 1000);
        });
    }

    function init(){

        clearInterval(intervalID);

        let homeSection = $(selectors.homeSection);

        if(!homeSection.length){
            homeSection = $("<section>",{
                id: "homeSection",
                class: "row justify-content-center",
            });
        }

        homeSection.appendTo(selectors.mainContainer);
        console.log(selectors.mainContainer);
    
        handleCoins();

        loadChosenCoinsToggle();
 
    }

    function aboutSection(){

        clearInterval(intervalID);
        
        let aboutSection = $(selectors.aboutSection);

        if(!aboutSection.length){
            aboutSection = $("<section>",{
                id: "aboutSection",
                class: "container-lg",
            });
        }

        aboutSection.appendTo(selectors.mainContainer);
            
        console.log(aboutSection);

        const content = `
            <div class="row container-lg justify-content-center">
                <img src="./images/IMG_6113.jpeg" alt="My dog, Moutoe" id="aboutPhoto" class="col-lg-6">
                <div class="bg-white text-black opacity-75 p-3 col-lg-6">
                    This crypto website was made to display 50 various cryptocurrencies currently dominating the crypto industry today. You can find the latest data by clicking "more info" on any cryptocurrency you like. Additionally, if you would like to see the ups and downs of a cryptocurrency's value in real time, select a few coins and check out the live report section. 
                    <br><br> -Natalie
                </div>
            </div>
        `;
            
        $("#aboutSection").html(content);

    }

    function liveReportSection(){
        
        let reportSection = $(selectors.reportSection);

        let coinsChosenArray = JSON.parse(localStorage.getItem(COINS_CHOSEN_ARRAY_KEY));
        console.log('coinsChosenArray live report: ', coinsChosenArray);

        if(!reportSection.length){
            reportSection = $("<section>",{
                id: "reportSection",
                class: "container-lg",
            });
        }

        reportSection.appendTo(selectors.mainContainer);

        // doesn't show graph data if no coins are selected
        if(Array.isArray(coinsChosenArray) && coinsChosenArray.length > 0){
            console.log('live report content fired');
            const content = `
                <div id="chartContainer"></div>
            `;
                
            $("#reportSection").html(content);

            handleGraphData();
        } 
        else if (!Array.isArray(coinsChosenArray) || !coinsChosenArray.length){
            const noGraphContent = `
                <div class="bg-white opacity-75 text-black text-center">
                Please select some coins and come back here.
                </div>
            `;
            $("#reportSection").html(noGraphContent);
        }

    }

    async function getCoinPrices(){
        newData.clear();
        try{
            $(loader).appendTo(selectors.mainContainer);
            prices = await getJSON(`https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coinsChosenArray}&tsyms=USD`);
            for(key in prices) {
                if(prices.hasOwnProperty(key)) {
                    let value = prices[key];
                    let pricesValueNumber = value.USD;
                    newData.set(key,pricesValueNumber);
                    console.log('key:',key)
                    console.log('value:',value)
                }
            }
        } catch (err) {
            alert(err.message);
        } finally {
            $(selectors.loader).remove();
        }
    };

    async function handleGraphData(){

        dataPoints = [];

        var chart = new CanvasJS.Chart("chartContainer", {
            exportEnabled: true,
            title:{
                text: "Live Coin Report"             
            }, 
            axisY:{
                title: "Value in USD"
            },
            toolTip: {
                shared: true
            },
            legend:{
                cursor:"pointer",
                itemclick: toggleDataSeries
            },
            data: []
        });

        async function createNewData(){

            await getCoinPrices();

                newData.forEach(function(value,key){
                    console.log('key in for each: ',key);
                    console.log('value in for each: ',value);
                    chart.options.data.push({
                        type: "spline",
                            name: key,        
                            showInLegend: true,
                            dataPoints:
                            [

                            ]
                            
                    });
                }
                )
        }

        async function updateData(){
            await getCoinPrices();
            for(i = 0; i < coinsChosenArray.length; i++){
                newData.forEach(function(value,key){
                    console.log('key:',key);
                    console.log('value:',value);
                    console.log(chart.options.data[i].name);
                    if(chart.options.data[i].name == key){
                        chart.options.data[i].dataPoints.push({label: new Date().toLocaleTimeString(), y: value});
                    }
                })
            }
        }

        await createNewData();

        chart.render();

        intervalID = setInterval(() => {
            updateData();
                chart.render();
        },TWO_SECONDS);

        function toggleDataSeries(e) {
            if(typeof(e.dataSeries.visible) === "undefined" || e.dataSeries.visible) {
                e.dataSeries.visible = false;
            }
            else {
                e.dataSeries.visible = true;            
            }
            chart.render();
        }
    }
});