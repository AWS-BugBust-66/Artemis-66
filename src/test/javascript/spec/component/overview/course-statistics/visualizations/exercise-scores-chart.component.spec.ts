import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { AlertService } from 'app/core/util/alert.service';
import { MockModule, MockPipe, MockProvider } from 'ng-mocks';
import { ExerciseScoresChartComponent } from 'app/overview/visualizations/exercise-scores-chart/exercise-scores-chart.component';
import { ArtemisTranslatePipe } from 'app/shared/pipes/artemis-translate.pipe';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { ExerciseScoresChartService, ExerciseScoresDTO } from 'app/overview/visualizations/exercise-scores-chart.service';
import { RouterTestingModule } from '@angular/router/testing';
import { ExerciseType } from 'app/entities/exercise.model';
import dayjs from 'dayjs';
import { HttpResponse } from '@angular/common/http';
import { LineChartModule } from '@swimlane/ngx-charts';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

class MockActivatedRoute {
    parent: any;
    params: any;

    constructor(options: { parent?: any; params?: any }) {
        this.parent = options.parent;
        this.params = options.params;
    }
}

const mockActivatedRoute = new MockActivatedRoute({
    parent: new MockActivatedRoute({
        params: of({ courseId: '1' }),
    }),
});

describe('ExerciseScoresChartComponent', () => {
    let fixture: ComponentFixture<ExerciseScoresChartComponent>;
    let component: ExerciseScoresChartComponent;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [MockModule(LineChartModule), RouterTestingModule.withRoutes([]), MockModule(BrowserAnimationsModule)],
            declarations: [ExerciseScoresChartComponent, MockPipe(ArtemisTranslatePipe)],
            providers: [
                MockProvider(AlertService),
                MockProvider(TranslateService),
                MockProvider(ExerciseScoresChartService),

                {
                    provide: ActivatedRoute,
                    useValue: mockActivatedRoute,
                },
            ],
        })
            .compileComponents()
            .then(() => {
                fixture = TestBed.createComponent(ExerciseScoresChartComponent);
                component = fixture.componentInstance;
            });
    });

    afterEach(function () {
        jest.restoreAllMocks();
    });

    it('should initialize', () => {
        fixture.detectChanges();
        expect(component.courseId).toBe(1);
    });

    it('should load exercise scores and generate chart', () => {
        const firstExercise = generateExerciseScoresDTO(ExerciseType.TEXT, 1, 50, 70, 100, dayjs(), 'First Exercise');
        const secondExercise = generateExerciseScoresDTO(ExerciseType.QUIZ, 1, 40, 80, 90, dayjs().add(5, 'days'), 'Second Exercise');

        const exerciseScoresChartService = TestBed.inject(ExerciseScoresChartService);
        const exerciseScoresResponse: HttpResponse<ExerciseScoresDTO[]> = new HttpResponse({
            body: [firstExercise, secondExercise],
            status: 200,
        });
        const getScoresStub = jest.spyOn(exerciseScoresChartService, 'getExerciseScoresForCourse').mockReturnValue(of(exerciseScoresResponse));
        component.ngAfterViewInit();
        expect(getScoresStub).toHaveBeenCalledTimes(1);
        expect(component.ngxData).toHaveLength(3);
        // datasets[0] is student score
        expect(component.ngxData[0].series).toHaveLength(2);
        const studentFirstExerciseDataPoint = component.ngxData[0].series[0];
        const sutdentSecondExerciseDataPoint = component.ngxData[0].series[1];
        validateStructureOfDataPoint(studentFirstExerciseDataPoint, firstExercise.exerciseId!, ExerciseType.TEXT, firstExercise.exerciseTitle!, firstExercise.scoreOfStudent!);
        validateStructureOfDataPoint(sutdentSecondExerciseDataPoint, secondExercise.exerciseId!, ExerciseType.QUIZ, secondExercise.exerciseTitle!, secondExercise.scoreOfStudent!);

        // datasets[1] is average score
        expect(component.ngxData[1].series).toHaveLength(2);
        const averageFirstExerciseDataPoint = component.ngxData[1].series[0];
        const averageSecondExerciseDataPoint = component.ngxData[1].series[1];
        validateStructureOfDataPoint(
            averageFirstExerciseDataPoint,
            firstExercise.exerciseId!,
            ExerciseType.TEXT,
            firstExercise.exerciseTitle!,
            firstExercise.averageScoreAchieved!,
        );
        validateStructureOfDataPoint(
            averageSecondExerciseDataPoint,
            secondExercise.exerciseId!,
            ExerciseType.QUIZ,
            secondExercise.exerciseTitle!,
            secondExercise.averageScoreAchieved!,
        );

        // datasets[2] is best score
        expect(component.ngxData[2].series).toHaveLength(2);
        const bestFirstExerciseDataPoint = component.ngxData[2].series[0];
        const bestSecondExerciseDataPoint = component.ngxData[2].series[1];
        validateStructureOfDataPoint(bestFirstExerciseDataPoint, firstExercise.exerciseId!, ExerciseType.TEXT, firstExercise.exerciseTitle!, firstExercise.maxScoreAchieved!);
        validateStructureOfDataPoint(bestSecondExerciseDataPoint, secondExercise.exerciseId!, ExerciseType.QUIZ, secondExercise.exerciseTitle!, secondExercise.maxScoreAchieved!);
    });
});

function validateStructureOfDataPoint(dataPoint: any, exerciseId: number, exerciseType: ExerciseType, exerciseTitle: string, score: number) {
    const expectedStructure = { name: exerciseTitle, value: score + 1, exerciseId, exerciseType };
    expect(dataPoint).toEqual(expectedStructure);
}

function generateExerciseScoresDTO(
    exerciseType: ExerciseType,
    exerciseId: number,
    scoreOfStudent: number,
    averageScore: number,
    maxScore: number,
    releaseDate: dayjs.Dayjs,
    exerciseTitle: string,
) {
    const dto = new ExerciseScoresDTO();
    dto.exerciseType = exerciseType;
    dto.exerciseId = exerciseId;
    dto.scoreOfStudent = scoreOfStudent;
    dto.averageScoreAchieved = averageScore;
    dto.maxScoreAchieved = maxScore;
    dto.releaseDate = releaseDate;
    dto.exerciseTitle = exerciseTitle;
    return dto;
}
