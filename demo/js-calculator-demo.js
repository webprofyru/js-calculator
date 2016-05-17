/** Инициализирует калькулятор ипотеки необходимыми параметрами */
initMortgageCalculator = function(){

	if($('#mortgagecalc').length != 1)
		return;

	var self = this;

	var calculator = new Calculator({
		selector: '#mortgagecalc' 
	});

	var $container = $('#mortgagecalc');

	this.calculator = calculator;

	calculator.addField({
		title: 'Первоначальный взнос',
		name: 'investment',
		code: 'INV',
		value: 2000000,
		min: '=PRICE / 5',
		max: function(values){
			return ((values.PRICE - 500000) / values.PRICE) <= 0.85 ? values.PRICE - 500000 : values.PRICE * 0.85;
		}
	});

	calculator.addField({
		title: 'Срок кредитования',
		name: 'duration',
		code: 'DUR',
		value: 7,
		min: 1,
		max: 30
	});

	calculator.addField({
		title: 'Стоимость квартиры',
		name: 'price',
		code: 'PRICE',
		value: 4000000,
		min: 625000,
		max: 20000000
	});

	calculator.addParameter({
		title: 'Процентная ставка',
		code: 'RATE',
		value: function(values){
			return ((values.INV / values.PRICE) >= 0.5 && values.DUR <= 7) ? 11.3 : 11.8;
		}
	});

	/** Проставляем аттрибуты data у полей, чтобы использовать их в слайдере */
	calculator.populateFieldsData();

	/** Инициализируем слайдеры */
	$container.find('.slider').each(function(){
		var name = $(this).data('input');
		var field = calculator.getFieldByName(name);
		var minmax = calculator.getMinMax(field);
		$(this).slider({
			min: minmax.min,
			max: minmax.max,
			value: field.value,
			slide: function(e, ui){
				sliderUpdateField(e, ui, field);
			},
			change: function(e, ui){
				sliderUpdateField(e, ui, field);
			}
		});
	});

	function sliderUpdateField(e, ui, field){
		field._input.value = ui.value;
	}

	/* $('#mortgagecalc input[name="price"]').closest('.sliderfield').sliderfield({
		log: false,
		split_by_three: true,
		precision: 0,
		significant_digits: 3
	});
	$('#mortgagecalc input[name="investment"]').closest('.sliderfield').sliderfield({
		log: true,
		split_by_three: true,
		precision: 0,
		significant_digits: 4
	});
	$('#mortgagecalc input[name="duration"]').closest('.sliderfield').sliderfield({
		log: false,
		split_by_three: false,
		precision: 0,
		significant_digits: 3
	});*/

	/** Цепляем обновление диапазона слайдера на коллбэк изменения диапазона калькулятора */
	calculator.setOptions({
		onBoundsChange: function(){
			/* $('.sliderfield').sliderfield('update'); */
		}
	});

	/** Добавляем расчёт */
	calculator.addResult({
		title: 'Ежемесячный платеж',
		formula: function(val){
			var OZ = val.PRICE - val.INV;
			var PS = val.RATE / 1200;
			return OZ * PS / ( 1 - Math.pow(1 + PS, -(val.DUR * 12 - 1)));
		},
		selector: '.calculator__value',
		format: function(val){
			return calculator.numberWithSpaces(Math.round(val)) + ' <span class="rubl">Р</span>';
		}
	});

	/** Изменяемую процентную ставку оформляем как отдельный расчёт, чтобы автоматически менять её в HTML */
	calculator.addResult({
		title: 'Процентная ставка',
		formula: '=RATE',
		selector: '.calculator__rate',
		format: function(val){
			return val.toString().replace('.', ',') + '%';
		}
	});

	/** Считаем в первый раз */
	calculator.calc();

	return this;
};

$(function(){
	var calc = initMortgageCalculator();
});