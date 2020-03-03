var CURRENT_RATES = {
    EUR: 27,
    USD: 25,
    EUR_USD: 1.11
};

fetch('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5')
    .then(response => response.json())
    .then(jsonData => {
        CURRENT_RATES.USD = parseFloat(jsonData.filter(d => d.ccy === 'USD')[0].sale);
        CURRENT_RATES.EUR = parseFloat(jsonData.filter(d => d.ccy === 'EUR')[0].sale);
    });

var rates = {
    car: {
        petrol: {'lessThan3L': 50, 'moreThan3L': 100},
        diesel: {'lessThan3.5L': 75, 'moreThan3.5L': 150},
        ageLimit: 15,
        ageLimitRate: 15,
        duty: {
            eu: 6.4,
            canada: 0,
            default: 10
        }
    },
    electro: {
        '1kWh': 1
    },
    hybrid: {
        excise: 100,
        duty: {
            eu: 5,
            east: 0,
            canada: 0,
            default: 10
        }
    },
    motocycle: {
        excise: {
            'lessThan500cm': 0.062,
            'lessThan800cm': 0.443,
            'moreThan800cm': 0.447,
        },
        duty: {
            eu: {
                scooter50To250cm: 1.7,
                motocycle50To125cm: 1.7,
                default: 0
            },
            east: 0,
            canada: 5,
            default: 10
        }
    },
    truck: {
        excise: {
            lorry: {
                'lessThan5tn': {
                    'new': 0.01,
                    'lessThan5y': 0.02,
                    'lessThan8y': 0.8,
                    'moreThan8y': 1
                },
                'lessThan20tn': {
                    'new': 0.013,
                    'lessThan5y': 0.026,
                    'lessThan8y': 1.04,
                    'moreThan8y': 1.3
                },
                'moreThan20tn': {
                    'new': 0.016,
                    'lessThan5y': 0.033,
                    'lessThan8y': 1.32,
                    'moreThan8y': 1.65
                }
            },
            truck: 0
        },
        duty: {
            lorry: {
                eu: {
                    lessThan5tPetrol: 2.5,
                    default: 5
                },
                canada: {
                    'lessThan5tDieselLessThan2.5l': 6.25,
                    default: 0
                },
                east: 0,
                default: 10
            },
            truck: {
                canada: 5,
                eu: 0,
                east: 0,
                default: 10
            }
        }
    },
    duty: 10,
    nds: 20,
    ms: 2027
};

var taxForms = document.querySelectorAll('.tax-form');
[].forEach.call(taxForms, function (form) {
    form.addEventListener('submit', calculateTaxAndShow);
});

function calculateTaxAndShow(evt) {
    evt.preventDefault();
console.log(CURRENT_RATES);
    var fields = this.elements;
    var formName = this.name;
    var price = +fields.price.value;
    var currency = fields.currency.value;
    var country = fields.country && fields.country.value;
    var vehicleType = fields.vehicleType && fields.vehicleType.value;
    var motor = fields.motor && fields.motor.value;
    var volume = fields.volume && +fields.volume.value;
    var issueYear = fields.year && +fields.year.value;
    var weight = fields.weight && +fields.weight.value;
    var power = fields.power && +fields.power.value;

    var currentYear = new Date().getFullYear();
    var age = currentYear - issueYear - 1;
    age = age >= 1 ? age : 1;

    var excise = 0;
    if (formName === 'car') {
        var motorRate = 0;
        var ageRate = age > rates.car.ageLimit ? rates.car.ageLimitRate : age;

        if (motor === 'petrol') {
            if (volume <= 3) {
                motorRate = rates.car.petrol['lessThan3L'];
            } else {
                motorRate = rates.car.petrol['moreThan3L'];
            }
        }

        if (motor === 'diesel') {
            if (volume <= 3.5) {
                motorRate = rates.car.diesel['lessThan3.5L'];
            } else {
                motorRate = rates.car.diesel['moreThan3.5L'];
            }
        }

        excise = Math.round(motorRate * ageRate * volume);
    }

    if (formName === 'electric') {
        excise = Math.round(rates.electro['1kWh'] * power);
    }

    if (formName === 'hybrid') {
        excise = rates.hybrid.excise;
    }

    if (formName === 'motocycle') {
        var exciseRateMoto = rates.motocycle.excise['moreThan800cm'];

        if (volume < 500) {
            exciseRateMoto = rates.motocycle.excise['lessThan500cm'];
        } else if (volume < 800) {
            exciseRateMoto = rates.motocycle.excise['lessThan800cm'];
        }

        excise = Math.round(exciseRateMoto * volume);
    }

    if (formName === 'truck') {
        if (vehicleType === 'lorry') {
            var weightCategory = rates.truck.excise[vehicleType]['moreThan20tn'];
            var exciseRateTruck = weightCategory['moreThan8y'];

            if (weight < 5000) {
                weightCategory = rates.truck.excise[vehicleType]['lessThan5tn'];
            } else if (weight < 20000) {
                weightCategory = rates.truck.excise[vehicleType]['lessThan20tn'];
            }

            if (age === 1) {
                exciseRateTruck = weightCategory['new'];
            } else if (age < 5) {
                exciseRateTruck = weightCategory['lessThan5y'];
            } else if (age < 8) {
                exciseRateTruck = weightCategory['lessThan8y'];
            }

            volume *= 1000; // dmВі to cmВі
            excise = Math.round(volume * exciseRateTruck);
        }
        if (vehicleType === 'truck') {
            excise = rates.truck.excise[vehicleType];
        }
    }

    var currentRate = 1;
    if (currency === 'USD') currentRate = CURRENT_RATES['EUR_USD'];
    if (currency === 'UAH') currentRate = CURRENT_RATES['EUR'];
    excise = Math.round(excise * currentRate);

    var duty = 0;
    var nds = 0;

    if (formName !== 'electric') {
        var dutyRate = rates.duty;

        if (formName === 'car') dutyRate = rates.car.duty[country];
        if (formName === 'hybrid') dutyRate = rates.hybrid.duty[country];
        if (formName === 'motocycle') {
            if (country === 'eu') {
                if (volume >= 50 && volume <= 125 && vehicleType === 'motocycle') {
                    dutyRate = rates.motocycle.duty.eu.motocycle50To125cm;
                } else if (volume >= 50 && volume <= 250 && vehicleType === 'scooter') {
                    dutyRate = rates.motocycle.duty.eu.scooter50To250cm;
                } else {
                    dutyRate = rates.motocycle.duty.eu.default;
                }
            } else {
                dutyRate = rates.motocycle.duty[country];
            }
        }
        if (formName === 'truck') {
            if (vehicleType === 'lorry') {
                if (country === 'eu') {
                    if (weight <= 5000 && motor === 'petrol') {
                        dutyRate = rates.truck.duty[vehicleType].eu.lessThan5tPetrol;
                    } else {
                        dutyRate = rates.truck.duty[vehicleType].eu.default;
                    }
                } else if (country === 'canada') {
                    if (weight <= 5000 && motor === 'diesel' && volume <= 2500) {
                        dutyRate = rates.truck.duty[vehicleType].canada['lessThan5tDieselLessThan2.5l'];
                    } else {
                        dutyRate = rates.truck.duty[vehicleType].canada.default;
                    }
                } else if (country === 'east') {
                    dutyRate = rates.truck.duty[vehicleType].east;
                } else {
                    dutyRate = rates.truck.duty[vehicleType].default;
                }
            }
            if (vehicleType === 'truck') {
                dutyRate = rates.truck.duty[vehicleType][country];
            }
        }

        duty = Math.round((price / 100) * dutyRate);
        nds = Math.round(((price + excise + duty) / 100) * rates.nds);
    }

    var ms165 = rates.ms * 165;
    var ms290 = rates.ms * 290;

    var grnPrice = price;
    if (currency in CURRENT_RATES) {
        grnPrice *= CURRENT_RATES[currency];
    }
    var pfRate = grnPrice <= ms165 ? 0.03 : grnPrice <= ms290 ? 0.04 : 0.05;
    var pensionFund = Math.round((price + excise + duty) * pfRate);

    var allFees = excise + duty + nds;
    var woPF = price + allFees;
    var resultPrice = woPF + pensionFund;
    var percentPrice = Math.round((allFees + pensionFund) * 100 / price);

    showResultTable({
        origPrice: price,
        nds: nds,
        duty: duty,
        pensionFund: pensionFund,
        excise: excise,
        percentPrice: percentPrice,
        allFees: allFees,
        resultPrice: resultPrice,
        currency: currency
    });
}

function showResultTable(data) {
    var formatter = new Intl.NumberFormat('ru-RU', {
        style: 'currency', currency: data.currency, minimumFractionDigits: 0, maximumFractionDigits: 0
    });
    var txt = function (selector, prop) {
        var number = data[prop];
        if (prop === 'percentPrice') {
            number = number + ' %';
        } else {
            number = formatter.format(number);
        }
        document.querySelector(selector).textContent = number;
    };

    txt('.taxes-table .orig-price', 'origPrice');
    txt('.taxes-table .result-price', 'resultPrice');
    txt('.taxes-table .nds', 'nds');
    txt('.taxes-table .duty', 'duty');
    txt('.taxes-table .pension-fund', 'pensionFund');
    txt('.taxes-table .excise', 'excise');
    txt('.taxes-table .all-fees', 'allFees');
    txt('.taxes-table .percent-price', 'percentPrice');

    var resultBlock = document.querySelector('.result-block');
    resultBlock.classList.remove('d-none');
    resultBlock.scrollIntoView();
}
